"""
Serializers for AI Settings
"""
from rest_framework import serializers
from .models_settings import AIModelConfig, UserAISettings, CustomAIModel


class AIModelConfigSerializer(serializers.ModelSerializer):
    """Serializer for AI Model Configuration"""
    
    class Meta:
        model = AIModelConfig
        fields = [
            'id', 'name', 'display_name', 'provider', 'model_id',
            'description', 'is_free', 'status', 'icon', 'order'
        ]


class UserAISettingsSerializer(serializers.ModelSerializer):
    """Serializer for User AI Settings"""
    selected_model = AIModelConfigSerializer(read_only=True)
    selected_model_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = UserAISettings
        fields = [
            'id', 'selected_model', 'selected_model_id',
            'openai_api_key', 'anthropic_api_key', 'cohere_api_key',
            'huggingface_api_key', 'custom_api_keys',
            'temperature', 'max_tokens', 'stream_responses', 'save_history'
        ]
        extra_kwargs = {
            'openai_api_key': {'write_only': True},
            'anthropic_api_key': {'write_only': True},
            'cohere_api_key': {'write_only': True},
            'huggingface_api_key': {'write_only': True},
        }
    
    def update(self, instance, validated_data):
        if 'selected_model_id' in validated_data:
            model_id = validated_data.pop('selected_model_id')
            try:
                instance.selected_model = AIModelConfig.objects.get(id=model_id)
            except AIModelConfig.DoesNotExist:
                pass
        
        return super().update(instance, validated_data)


class CustomAIModelSerializer(serializers.ModelSerializer):
    """Serializer for Custom AI Models"""
    
    class Meta:
        model = CustomAIModel
        fields = [
            'id', 'name', 'endpoint_url', 'api_key', 'headers',
            'request_format', 'response_path', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'api_key': {'write_only': True}
        }
