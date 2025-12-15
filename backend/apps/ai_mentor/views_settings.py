"""
Views for AI Settings Management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models_settings import AIModelConfig, UserAISettings, CustomAIModel
from .serializers_settings import (
    AIModelConfigSerializer, 
    UserAISettingsSerializer,
    CustomAIModelSerializer
)


class AIModelConfigViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for AI Model Configurations (read-only for users)"""
    queryset = AIModelConfig.objects.filter(status__in=['active', 'coming_soon'])
    serializer_class = AIModelConfigSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get available models based on status"""
        queryset = super().get_queryset()
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by provider if provided
        provider = self.request.query_params.get('provider')
        if provider:
            queryset = queryset.filter(provider=provider)
        
        return queryset.order_by('order', 'name')
    
    @action(detail=False, methods=['get'])
    def available_models(self, request):
        """Get all available models for selection"""
        models = self.get_queryset()
        
        # Group by provider
        grouped = {}
        for model in models:
            provider = model.get_provider_display()
            if provider not in grouped:
                grouped[provider] = []
            grouped[provider].append(AIModelConfigSerializer(model).data)
        
        return Response(grouped)


class UserAISettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for User AI Settings"""
    serializer_class = UserAISettingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserAISettings.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Get or create user's AI settings"""
        settings, created = UserAISettings.objects.get_or_create(
            user=request.user,
            defaults={}
        )
        
        # Also check AIMentorProfile for the preferred model
        from .models import AIMentorProfile
        profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
        
        serializer = self.get_serializer(settings)
        data = serializer.data
        
        # Include the preferred model from AIMentorProfile
        data['preferred_ai_model'] = profile.preferred_ai_model
        
        return Response(data)
    
    def create(self, request, *args, **kwargs):
        """Save user's AI settings - handle both POST and PUT"""
        return self._save_settings(request)
    
    def update(self, request, *args, **kwargs):
        """Update user's AI settings"""
        return self._save_settings(request)
    
    def _save_settings(self, request):
        """Common method to save AI settings"""
        import logging
        save_logger = logging.getLogger(__name__)
        save_logger.info(f"_save_settings received request.data: {dict(request.data)}")
        
        settings, created = UserAISettings.objects.get_or_create(
            user=request.user
        )
        
        # Extract model ID before serializer validation (it's a string, not UUID)
        selected_model_id = request.data.get('selected_model_id') or request.data.get('model')
        save_logger.info(f"_save_settings extracted selected_model_id: {selected_model_id}")
        
        # Create a copy of request data without selected_model_id to avoid serializer UUID validation
        data_for_serializer = {k: v for k, v in request.data.items() if k not in ['selected_model_id', 'model']}
        
        # Save model selection to AIMentorProfile
        if selected_model_id:
            from .models import AIMentorProfile
            profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
            profile.preferred_ai_model = selected_model_id
            profile.save()
            import logging
            logging.getLogger(__name__).info(f"Saved preferred_ai_model: {selected_model_id} for user {request.user.username}")
        
        serializer = self.get_serializer(settings, data=data_for_serializer, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                **serializer.data,
                'preferred_ai_model': selected_model_id,
                'message': 'Settings saved successfully'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def test_model(self, request):
        """Test a model with a sample prompt"""
        model_id = request.data.get('model_id')
        api_key = request.data.get('api_key', '')
        test_prompt = request.data.get('prompt', 'Hello, can you introduce yourself?')
        
        try:
            # Handle both UUID and string model IDs
            if model_id in ['gemini', 'openai', 'anthropic', 'cohere']:
                # Direct provider test
                provider = model_id
                display_name = model_id.title()
            else:
                try:
                    model = AIModelConfig.objects.get(id=model_id)
                    provider = model.provider
                    display_name = model.display_name
                except AIModelConfig.DoesNotExist:
                    # Fallback for testing without database
                    provider = 'gemini'
                    display_name = 'Gemini'
            
            # Import AI service
            from .services.ai_service import AIServiceFactory
            
            # Only Gemini is active for now
            if provider == 'gemini':
                service = AIServiceFactory.get_service('google_gemini')
                response = service.generate_response(test_prompt)
                
                return Response({
                    'success': True,
                    'model': display_name,
                    'response': response
                })
            else:
                return Response(
                    {'error': f'{display_name} is coming soon! Only Gemini is currently available.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except AIModelConfig.DoesNotExist:
            return Response(
                {'error': 'Model not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomAIModelViewSet(viewsets.ModelViewSet):
    """ViewSet for Custom AI Models"""
    serializer_class = CustomAIModelSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CustomAIModel.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a custom model"""
        model = self.get_object()
        test_prompt = request.data.get('prompt', 'Hello, test message')
        
        import requests
        
        try:
            # Prepare request based on model configuration
            headers = model.headers.copy()
            headers['Authorization'] = f'Bearer {model.api_key}'
            
            # Replace placeholders in request format
            body = model.request_format.copy()
            for key, value in body.items():
                if isinstance(value, str) and '{prompt}' in value:
                    body[key] = value.replace('{prompt}', test_prompt)
            
            # Make request
            response = requests.post(
                model.endpoint_url,
                json=body,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract response using path
                result = data
                for key in model.response_path.split('.'):
                    result = result.get(key, '')
                
                return Response({
                    'success': True,
                    'response': result
                })
            else:
                return Response({
                    'error': f'API returned status {response.status_code}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
