"""
Updated Views for AI Mentor app with AI model selection
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.conf import settings

from .models import (
    AIMentorProfile, ProjectMentorSession, AIMessage,
    CodeAnalysis, LearningRecommendation
)
from .serializers import (
    AIMentorProfileSerializer, ProjectMentorSessionSerializer,
    AIMessageSerializer, CodeAnalysisSerializer,
    LearningRecommendationSerializer
)
from .services.ai_service import (
    AIServiceFactory, get_ai_response, get_ai_response_with_context, analyze_code_with_ai
)
from .services.intent_service import classify_intent, extract_confirmation_response, IntentType
from .services.action_service import ActionService
from .services.content_generator import ContentGenerator


def get_user_role(user) -> str:
    """
    Determine user role for AI prompt customization.
    Returns: 'admin', 'instructor', or 'student'
    """
    if not user or not user.is_authenticated:
        return 'student'
    
    # Check if user is admin
    if user.is_superuser or user.is_staff:
        return 'admin'
    
    # Check if user has instructor role from UserProfile
    try:
        from apps.auth_app.models import UserProfile
        profile = UserProfile.objects.filter(user=user).first()
        if profile and profile.role in ['instructor', 'teacher', 'faculty']:
            return 'instructor'
    except Exception:
        pass
    
    return 'student'


class AIModelConfigView(APIView):
    """View for AI model configuration"""
    permission_classes = [IsAuthenticated]
    
    # All valid model types
    VALID_MODELS = [
        'openrouter_gemini', 'openrouter_amazon_nova', 'openrouter_deepseek', 'openrouter_mistral',
        'google_gemini', 'gemini_direct', 'openai_gpt4', 'anthropic_claude', 'openrouter', 'local'
    ]
    
    def get(self, request):
        """Get available AI models and current configuration"""
        models = AIServiceFactory.get_available_models()
        
        # Get user's current model - return None if not set
        current_model = None
        if hasattr(request.user, 'ai_mentor_profile') and request.user.ai_mentor_profile.preferred_ai_model:
            current_model = request.user.ai_mentor_profile.preferred_ai_model
        
        return Response({
            'models': models,
            'current_model': current_model,
            'model_required': current_model is None  # Tell frontend if selection is needed
        })
    
    def post(self, request):
        """Set user's preferred AI model"""
        model_type = request.data.get('model')
        
        if model_type not in self.VALID_MODELS:
            return Response(
                {'error': f'Invalid model type. Allowed: {", ".join(self.VALID_MODELS)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update or create AI mentor profile
        profile, created = AIMentorProfile.objects.get_or_create(user=request.user)
        profile.preferred_ai_model = model_type
        profile.save()
        
        # Test the model
        try:
            test_result = AIServiceFactory.test_model(model_type)
        except Exception as e:
            test_result = {"status": "error", "message": str(e)}
        
        return Response({
            'message': f'AI model set to {model_type}',
            'model': model_type,
            'test_result': test_result
        })


class AIMentorProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for AIMentorProfile"""
    serializer_class = AIMentorProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AIMentorProfile.objects.filter(user=self.request.user)


class ProjectMentorSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for ProjectMentorSession"""
    serializer_class = ProjectMentorSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ProjectMentorSession.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send message in AI session with automation support"""
        session = self.get_object()
        message_text = request.data.get('message')
        execute_action = request.data.get('execute_action', False)
        
        if not message_text:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Input validation - message length limit
        if len(message_text) > 5000:
            return Response(
                {'error': 'Message is too long. Please keep it under 5000 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Sanitize input - strip HTML tags for security
        from django.utils.html import strip_tags
        message_text = strip_tags(message_text).strip()
        
        if not message_text:
            return Response(
                {'error': 'Message cannot be empty after sanitization'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save user message
        user_message = AIMessage.objects.create(
            session=session,
            sender='user',
            message=message_text
        )
        
        # Get user's preferred model - require selection
        profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
        model_type = profile.preferred_ai_model
        
        # Migrate legacy model IDs to OpenRouter equivalents (only for old google_gemini)
        # Note: gemini_direct is intentionally NOT migrated - it uses direct Gemini API
        legacy_model_map = {
            'google_gemini': 'openrouter_gemini',
            'gemini': 'openrouter_gemini',
        }
        if model_type in legacy_model_map:
            model_type = legacy_model_map[model_type]
            # Save the migrated model to profile
            profile.preferred_ai_model = model_type
            profile.save()
        
        if not model_type:
            return Response(
                {'error': 'Please select an AI model in settings before chatting.', 'model_required': True},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get conversation context (last 10 messages)
        recent_messages = AIMessage.objects.filter(
            session=session
        ).order_by('-created_at')[:10]
        
        context = [
            {
                'sender': msg.sender,
                'message': msg.message
            }
            for msg in reversed(recent_messages)
        ][:-1]  # Exclude the current message
        
        # Initialize services
        action_service = ActionService(request.user)
        content_generator = ContentGenerator(request.user, model_type=model_type)
        
        # Check if user is confirming a previous action
        last_ai_message = recent_messages.first()
        awaiting_confirmation = False
        if last_ai_message and last_ai_message.metadata:
            awaiting_confirmation = last_ai_message.metadata.get('awaiting_confirmation', False)
        
        if awaiting_confirmation:
            # Check if user is confirming
            confirmation = extract_confirmation_response(message_text)
            
            if confirmation is True:
                execute_action = True
                # Get the pending action data
                pending_intent = last_ai_message.metadata.get('intent')
                pending_data = last_ai_message.metadata.get('action_data', {})
            elif confirmation is False:
                # User declined
                ai_response_text = "No problem! Is there anything else I can help you with?"
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=len(ai_response_text.split())
                )
                
                profile.total_interactions += 1
                profile.save()
                
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data,
                    'action': {'type': 'cancelled'}
                })
        
        if not awaiting_confirmation:
            # Classify intent for new message
            intent_data = classify_intent(message_text, context, model_type=model_type)
            
            # Keyword-based fallback if AI returns general_question
            if intent_data['intent'] == IntentType.GENERAL_QUESTION or intent_data.get('confidence', 0) < 0.6:
                message_lower = message_text.lower()
                
                # Check for progress-related keywords
                if any(kw in message_lower for kw in ['my progress', 'my courses', 'enrolled', 'what am i learning', 'my learning']):
                    intent_data = {'intent': IntentType.VIEW_PROGRESS, 'parameters': {}, 'confidence': 0.9, 'requires_confirmation': False}
                
                # Check for project-related keywords
                elif any(kw in message_lower for kw in ['my projects', 'my project', 'projects i', 'working on']):
                    intent_data = {'intent': IntentType.VIEW_MY_PROJECTS, 'parameters': {}, 'confidence': 0.9, 'requires_confirmation': False}
                
                # Check for navigation keywords
                elif any(kw in message_lower for kw in ['go to', 'take me to', 'open', 'navigate to', 'show me the']):
                    intent_data = {'intent': IntentType.NAVIGATE, 'parameters': {}, 'confidence': 0.9, 'requires_confirmation': False}
                
                # Check for search keywords
                elif any(kw in message_lower for kw in ['find', 'search', 'look for', 'show me']):
                    # Extract search query
                    query = message_text
                    for prefix in ['find me', 'find', 'search for', 'search', 'look for', 'show me']:
                        if prefix in message_lower:
                            query = message_text[message_lower.index(prefix) + len(prefix):].strip()
                            break
                    intent_data = {'intent': IntentType.SEARCH, 'parameters': {'search_query': query}, 'confidence': 0.9, 'requires_confirmation': False}
                
                # Check for follow keywords
                elif 'follow' in message_lower and '@' in message_text:
                    import re
                    match = re.search(r'@(\w+)', message_text)
                    username = match.group(1) if match else ''
                    if 'unfollow' in message_lower:
                        intent_data = {'intent': IntentType.UNFOLLOW_USER, 'parameters': {'username': username}, 'confidence': 0.9, 'requires_confirmation': False}
                    else:
                        intent_data = {'intent': IntentType.FOLLOW_USER, 'parameters': {'username': username}, 'confidence': 0.9, 'requires_confirmation': False}
                
                # Check for enroll keywords
                elif any(kw in message_lower for kw in ['enroll me', 'enroll in', 'sign me up', 'join course']):
                    intent_data = {'intent': IntentType.ENROLL, 'parameters': {}, 'confidence': 0.9, 'requires_confirmation': True}
        else:
            # Use pending intent
            intent_data = {
                'intent': pending_intent,
                'parameters': pending_data,
                'confidence': 1.0,
                'requires_confirmation': False
            }
        
        # Handle based on intent
        if intent_data['intent'] == IntentType.SEARCH:
            # Perform search using DataContextService for better matching
            from .services.data_context_service import DataContextService
            data_service = DataContextService(request.user)
            
            query = intent_data['parameters'].get('search_query', message_text)
            
            # Try exact course match first
            exact_course = data_service.get_course_by_name(query)
            
            if exact_course:
                # Found exact match
                results = {
                    'total': 1,
                    'paths': [exact_course],
                    'modules': []
                }
                ai_prompt = f"""User searched for: "{query}"

EXACT MATCH FOUND: {exact_course['name']}
- Description: {exact_course['description'][:200]}
- Modules: {exact_course['module_count']}
- Difficulty: {exact_course['difficulty']}

Present this course enthusiastically and ask if they want to enroll!"""
            else:
                # Fall back to fuzzy search
                searched_courses = data_service.search_courses(query)
                results = action_service.search_courses(query)
                
                # Merge results
                if searched_courses:
                    results['paths'] = searched_courses
                    results['total'] = len(searched_courses)
                
                if results['total'] > 0:
                    results_summary = f"Found {results['total']} results:\n\n"
                    results_summary += "Career Paths:\n"
                    for path in results['paths'][:5]:
                        results_summary += f"- {path.get('name', 'Unknown')}: {path.get('description', '')[:100]}...\n"
                    
                    ai_prompt = f"""User searched for: "{query}"

Results: {results_summary}

Generate a friendly response presenting these results. Ask if they want to enroll in any."""
                else:
                    # No results - suggest available courses
                    all_courses = data_service.get_all_courses()
                    suggestions = ", ".join([c['name'] for c in all_courses[:5]])
                    
                    ai_prompt = f"""User searched for: "{query}"

No exact matches found.

Available courses on the platform: {suggestions}

Generate a helpful response suggesting these alternatives or asking to clarify their search."""
            
            ai_response_text = get_ai_response(ai_prompt, model_type=model_type, user_role=get_user_role(request.user))
            tokens_used = len(ai_response_text.split())
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=tokens_used,
                metadata={
                    'intent': intent_data['intent'],
                    'search_results': results
                }
            )
            
            profile.total_interactions += 1
            profile.total_tokens_used += tokens_used
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'search_results',
                    'navigate_to': '/learning',
                    'search_query': query,
                    'results': results
                }
            })
        
        elif intent_data['intent'] == IntentType.ENROLL and execute_action:
            # Execute enrollment
            path_id = intent_data['parameters'].get('path_id')
            if not path_id and last_ai_message and last_ai_message.metadata:
                # Try to get from search results
                search_results = last_ai_message.metadata.get('search_results', {})
                if search_results.get('paths'):
                    path_id = search_results['paths'][0]['id']
            
            if path_id:
                result = action_service.enroll_in_path(path_id)
                
                if result['success']:
                    ai_prompt = f"""User successfully enrolled in: {result['path']['name']}

Generate a congratulatory message and suggest they start with the first module."""
                else:
                    ai_prompt = f"""Enrollment failed: {result['message']}

Generate a helpful response."""
                
                ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
                tokens_used = len(ai_response_text.split())
                
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=tokens_used,
                    metadata={'action_result': result}
                )
                
                profile.total_interactions += 1
                profile.total_tokens_used += tokens_used
                profile.save()
                
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data,
                    'action': {
                        'type': 'enrolled',
                        'result': result,
                        'navigate_to': f"/learning/{path_id}" if result['success'] else None
                    }
                })
            else:
                # Unable to determine path to enroll
                fallback_text = "I couldn't determine which course to enroll you in. Try searching for a course first, then click Enroll."
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=fallback_text,
                    tokens_used=len(fallback_text.split())
                )
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
        
        elif intent_data['intent'] == IntentType.CREATE_PROJECT and execute_action:
            # Generate and create project
            project_idea = intent_data['parameters'].get('topic', message_text)
            project_details = content_generator.generate_project_description(project_idea)
            
            if project_details.get('success'):
                result = action_service.create_project({
                    'title': project_details.get('title', (project_idea or 'New Project')[:80]),
                    'description': project_details.get('description', project_idea or ''),
                    'tech_stack': project_details.get('tech_stack', []),
                    'status': 'planning',
                    'looking_for_contributors': False
                })
                
                if result.get('success'):
                    ai_prompt = f"""Project created successfully: {result['project']['title']}

Generate a congratulatory message and suggest next steps."""
                    
                    ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
                    tokens_used = len(ai_response_text.split())
                    
                    ai_response = AIMessage.objects.create(
                        session=session,
                        sender='ai',
                        message=ai_response_text,
                        tokens_used=tokens_used,
                        metadata={'action_result': result}
                    )
                    
                    profile.total_interactions += 1
                    profile.total_tokens_used += tokens_used
                    profile.save()
                    
                    return Response({
                        'user_message': AIMessageSerializer(user_message).data,
                        'ai_response': AIMessageSerializer(ai_response).data,
                        'action': {
                            'type': 'project_created',
                            'result': result,
                            'navigate_to': f"/projects/{result['project']['id']}"
                        }
                    })
                else:
                    # Project creation failed gracefully
                    fail_text = f"Project creation failed: {result.get('message', 'Unknown error')}"
                    ai_response = AIMessage.objects.create(
                        session=session,
                        sender='ai',
                        message=fail_text,
                        tokens_used=len(fail_text.split()),
                        metadata={'action_result': result}
                    )
                    return Response({
                        'user_message': AIMessageSerializer(user_message).data,
                        'ai_response': AIMessageSerializer(ai_response).data,
                        'action': {'type': 'error', 'message': result.get('message', 'Project creation failed')}
                    })
            else:
                # Could not generate project details
                info_text = "I couldn't generate the project details. Please try again or provide a title and brief description."
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=info_text,
                    tokens_used=len(info_text.split())
                )
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
        
        elif intent_data['intent'] == IntentType.CREATE_PROJECT and not execute_action:
            # Generate project proposal
            project_idea = intent_data['parameters'].get('topic', message_text)
            project_details = content_generator.generate_project_description(project_idea)
            
            ai_prompt = f"""User wants to create a project: "{project_idea}"

Generated details:
- Title: {project_details['title']}
- Description: {project_details['description']}
- Tech Stack: {project_details['tech_stack']}
- Features: {', '.join(project_details.get('features', []))}

Present these details in a friendly way and ask for confirmation to create the project."""
            
            ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
            tokens_used = len(ai_response_text.split())
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=tokens_used,
                metadata={
                    'intent': intent_data['intent'],
                    'awaiting_confirmation': True,
                    'action_data': project_details
                }
            )
            
            profile.total_interactions += 1
            profile.total_tokens_used += tokens_used
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'confirmation_required',
                    'action_type': 'create_project',
                    'data': project_details
                }
            })
        
        elif intent_data['intent'] == IntentType.CREATE_POST and execute_action:
            # Generate and create post
            topic = intent_data['parameters'].get('topic', message_text)
            post_content = content_generator.generate_post_content(topic)
            
            if post_content.get('success'):
                result = action_service.create_community_post(
                    post_content.get('content', ''),
                    post_content.get('hashtags', [])
                )
                
                if result.get('success'):
                    ai_prompt = f"""Post published successfully!

Content: {post_content.get('content','')[:100]}...

Generate a congratulatory message."""
                    
                    ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
                    tokens_used = len(ai_response_text.split())
                    
                    ai_response = AIMessage.objects.create(
                        session=session,
                        sender='ai',
                        message=ai_response_text,
                        tokens_used=tokens_used,
                        metadata={'action_result': result}
                    )
                    
                    profile.total_interactions += 1
                    profile.total_tokens_used += tokens_used
                    profile.save()
                    
                    return Response({
                        'user_message': AIMessageSerializer(user_message).data,
                        'ai_response': AIMessageSerializer(ai_response).data,
                        'action': {
                            'type': 'post_created',
                            'result': result,
                            'navigate_to': '/community'
                        }
                    })
                else:
                    fail_text = f"Post creation failed: {result.get('message','Unknown error')}"
                    ai_response = AIMessage.objects.create(
                        session=session,
                        sender='ai',
                        message=fail_text,
                        tokens_used=len(fail_text.split()),
                        metadata={'action_result': result}
                    )
                    return Response({
                        'user_message': AIMessageSerializer(user_message).data,
                        'ai_response': AIMessageSerializer(ai_response).data,
                        'action': {'type': 'error', 'message': result.get('message', 'Post creation failed')}
                    })
            else:
                info_text = "I couldn't generate the post content. Please try again with a clearer topic."
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=info_text,
                    tokens_used=len(info_text.split())
                )
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
        
        elif intent_data['intent'] == IntentType.CREATE_POST and not execute_action:
            # Generate post preview
            topic = intent_data['parameters'].get('topic', message_text)
            post_content = content_generator.generate_post_content(topic)
            
            ai_prompt = f"""User wants to create a post about: "{topic}"

Generated content:
{post_content['content']}

Hashtags: {', '.join(post_content.get('hashtags', []))}

Present this content and ask for confirmation to post it."""
            
            ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
            tokens_used = len(ai_response_text.split())
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=tokens_used,
                metadata={
                    'intent': intent_data['intent'],
                    'awaiting_confirmation': True,
                    'action_data': post_content
                }
            )
            
            profile.total_interactions += 1
            profile.total_tokens_used += tokens_used
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'confirmation_required',
                    'action_type': 'create_post',
                    'data': post_content
                }
            })
        
        elif intent_data['intent'] == IntentType.VIEW_PROGRESS:
            # Get user's enrolled courses and progress
            result = action_service.get_user_progress()
            
            if result['total'] > 0:
                progress_summary = f"You are enrolled in {result['total']} courses:\n\n"
                for course in result['enrolled_courses']:
                    progress_summary += f"- {course['name']} ({course['status']})\n"
                
                ai_prompt = f"""Present the user's learning progress in a friendly, encouraging way:

{progress_summary}

Encourage them to continue learning and suggest they can ask for help with any course."""
            else:
                ai_prompt = """The user has not enrolled in any courses yet.

Encourage them to explore available courses and offer to help them find something that matches their interests."""
            
            ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
            tokens_used = len(ai_response_text.split())
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=tokens_used,
                metadata={'progress_results': result}
            )
            
            profile.total_interactions += 1
            profile.total_tokens_used += tokens_used
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'progress_results',
                    'results': result,
                    'navigate_to': '/learning'
                }
            })
        
        elif intent_data['intent'] == IntentType.VIEW_MY_PROJECTS:
            # Get user's projects
            result = action_service.get_user_projects()
            
            if result['total'] > 0:
                projects_summary = f"You have {result['total']} projects:\n\n"
                for p in result['owned_projects']:
                    projects_summary += f"- {p['title']} (Owner, {p['status']})\n"
                for p in result['member_projects']:
                    projects_summary += f"- {p['title']} (Member)\n"
                
                ai_prompt = f"""Present the user's projects in a friendly way:

{projects_summary}

Ask if they want to work on any of these or create a new project."""
            else:
                ai_prompt = """The user doesn't have any projects yet.

Encourage them to create their first project or join existing ones. Offer to help them get started."""
            
            ai_response_text = get_ai_response(ai_prompt, model_type=model_type)
            tokens_used = len(ai_response_text.split())
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=tokens_used,
                metadata={'projects_results': result}
            )
            
            profile.total_interactions += 1
            profile.total_tokens_used += tokens_used
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'projects_results',
                    'results': result,
                    'navigate_to': '/projects'
                }
            })
        
        elif intent_data['intent'] == IntentType.UNENROLL:
            # Unenroll from a course
            path_id = intent_data['parameters'].get('path_id')
            
            if not path_id:
                # Get user's enrolled courses to let them choose
                progress_result = action_service.get_user_progress()
                
                if progress_result['total'] > 0:
                    ai_response_text = "Which course would you like to unenroll from?\n\n"
                    for course in progress_result['enrolled_courses']:
                        ai_response_text += f"- {course['name']}\n"
                    ai_response_text += "\nJust tell me the course name."
                else:
                    ai_response_text = "You're not enrolled in any courses yet!"
                
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=len(ai_response_text.split())
                )
                
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
            
            result = action_service.unenroll_from_path(path_id)
            
            ai_response_text = result['message']
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split()),
                metadata={'action_result': result}
            )
            
            profile.total_interactions += 1
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'unenrolled' if result['success'] else 'error',
                    'result': result
                }
            })
        
        elif intent_data['intent'] == IntentType.FOLLOW_USER:
            # Follow a user
            username = intent_data['parameters'].get('username', '').strip('@')
            
            if not username:
                ai_response_text = "Who would you like to follow? Please mention their username with @, e.g., 'follow @john'"
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=len(ai_response_text.split())
                )
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
            
            result = action_service.follow_user(username)
            
            ai_response_text = result['message']
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split()),
                metadata={'action_result': result}
            )
            
            profile.total_interactions += 1
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'user_followed' if result['success'] else 'error',
                    'result': result,
                    'navigate_to': f"/user/{result.get('user', {}).get('id')}" if result['success'] else None
                }
            })
        
        elif intent_data['intent'] == IntentType.UNFOLLOW_USER:
            # Unfollow a user
            username = intent_data['parameters'].get('username', '').strip('@')
            
            if not username:
                ai_response_text = "Who would you like to unfollow? Please mention their username."
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=len(ai_response_text.split())
                )
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
            
            result = action_service.unfollow_user(username)
            
            ai_response_text = result['message']
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split()),
                metadata={'action_result': result}
            )
            
            profile.total_interactions += 1
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'user_unfollowed' if result['success'] else 'error',
                    'result': result
                }
            })
        
        elif intent_data['intent'] == IntentType.VIEW_USER_PROFILE:
            # Search for and view a user's profile
            username = intent_data['parameters'].get('username', '').strip('@')
            
            if not username:
                # Extract username from message
                import re
                match = re.search(r'@(\w+)', message_text)
                if match:
                    username = match.group(1)
                else:
                    # Try to find any name mentioned
                    words = message_text.replace("'s", "").replace("profile", "").split()
                    for word in words:
                        if word.lower() not in ['show', 'view', 'see', 'find', 'the', 'of', 'who', 'is']:
                            username = word
                            break
            
            if username:
                result = action_service.search_users(username)
                
                if result['users']:
                    user = result['users'][0]
                    ai_response_text = f"Found {user['full_name']} (@{user['username']}). Opening their profile..."
                    ai_response = AIMessage.objects.create(
                        session=session,
                        sender='ai',
                        message=ai_response_text,
                        tokens_used=len(ai_response_text.split())
                    )
                    
                    return Response({
                        'user_message': AIMessageSerializer(user_message).data,
                        'ai_response': AIMessageSerializer(ai_response).data,
                        'action': {
                            'type': 'navigate',
                            'navigate_to': f"/user/{user['id']}"
                        }
                    })
                else:
                    ai_response_text = f"I couldn't find a user with username '{username}'. Please check the spelling."
            else:
                ai_response_text = "Whose profile would you like to view? Just mention their @username."
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split())
            )
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data
            })
        
        elif intent_data['intent'] == IntentType.NAVIGATE:
            # Handle navigation requests
            message_lower = message_text.lower()
            
            navigate_to = None
            page_name = ""
            
            if 'learning' in message_lower or 'course' in message_lower:
                navigate_to = '/learning'
                page_name = 'Learning Center'
            elif 'project' in message_lower:
                navigate_to = '/projects'
                page_name = 'Projects'
            elif 'community' in message_lower or 'social' in message_lower or 'feed' in message_lower:
                navigate_to = '/community'
                page_name = 'Community'
            elif 'profile' in message_lower and ('my' in message_lower or 'me' in message_lower):
                navigate_to = '/profile'
                page_name = 'Your Profile'
            elif 'dashboard' in message_lower or 'home' in message_lower:
                navigate_to = '/dashboard'
                page_name = 'Dashboard'
            elif 'leaderboard' in message_lower or 'ranking' in message_lower or 'scores' in message_lower:
                navigate_to = '/leaderboard'
                page_name = 'Leaderboard'
            elif 'chat' in message_lower or 'message' in message_lower:
                navigate_to = '/community'
                page_name = 'Community Chat'
            elif 'setting' in message_lower or 'preference' in message_lower:
                navigate_to = '/settings'
                page_name = 'Settings'
            elif 'notification' in message_lower or 'alert' in message_lower:
                navigate_to = '/notifications'
                page_name = 'Notifications'
            elif 'admin' in message_lower and ('panel' in message_lower or 'dashboard' in message_lower):
                navigate_to = '/admin-dashboard'
                page_name = 'Admin Dashboard'
            
            if navigate_to:
                ai_response_text = f"Taking you to {page_name}..."
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=len(ai_response_text.split())
                )
                
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data,
                    'action': {
                        'type': 'navigate',
                        'navigate_to': navigate_to
                    }
                })
            else:
                ai_response_text = "Where would you like to go? I can take you to Learning, Projects, Community, Profile, Dashboard, or Leaderboard."
                ai_response = AIMessage.objects.create(
                    session=session,
                    sender='ai',
                    message=ai_response_text,
                    tokens_used=len(ai_response_text.split())
                )
                
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_response': AIMessageSerializer(ai_response).data
                })
        
        elif intent_data['intent'] == IntentType.LIKE_POST:
            # Like a post
            post_id = intent_data['parameters'].get('post_id')
            
            if not post_id:
                ai_response_text = "Which post would you like to like? Please specify the post ID or navigate to the Community page to like posts directly."
            else:
                result = action_service.like_post(int(post_id))
                ai_response_text = result['message']
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split())
            )
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'post_liked' if post_id else 'info'
                }
            })
        
        elif intent_data['intent'] == IntentType.COMMENT_ON_POST:
            # Comment on a post
            post_id = intent_data['parameters'].get('post_id')
            topic = intent_data['parameters'].get('topic', message_text)
            
            if not post_id:
                ai_response_text = "Which post would you like to comment on? Please navigate to the Community page to comment on posts directly."
            else:
                # Generate a comment based on topic
                content_generator = ContentGenerator(request.user, model_type=model_type)
                comment_content = content_generator.generate_comment(topic)
                
                result = action_service.comment_on_post(int(post_id), comment_content.get('content', topic))
                ai_response_text = result['message']
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split())
            )
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'action': {
                    'type': 'comment_created' if post_id else 'info'
                }
            })
        
        elif intent_data['intent'] == IntentType.SEND_MESSAGE:
            # Send a message to a user - redirect to community chat
            username = intent_data['parameters'].get('username', '').strip('@')
            
            if username:
                result = action_service.search_users(username)
                
                if result['users']:
                    user = result['users'][0]
                    ai_response_text = f"Opening chat with {user['full_name']} (@{user['username']})..."
                    
                    ai_response = AIMessage.objects.create(
                        session=session,
                        sender='ai',
                        message=ai_response_text,
                        tokens_used=len(ai_response_text.split())
                    )
                    
                    return Response({
                        'user_message': AIMessageSerializer(user_message).data,
                        'ai_response': AIMessageSerializer(ai_response).data,
                        'action': {
                            'type': 'open_chat',
                            'navigate_to': '/community',
                            'chat_user_id': user['id']
                        }
                    })
                else:
                    ai_response_text = f"I couldn't find a user with username '{username}'."
            else:
                ai_response_text = "Who would you like to message? Please mention their @username."
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=len(ai_response_text.split())
            )
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data
            })
        
        else:
            # General question - use context-aware AI response with database data
            try:
                ai_response_text = get_ai_response_with_context(
                    prompt=message_text,
                    user=request.user,
                    model_type=model_type,
                    context=context,
                    include_stats=True,
                    include_courses=True,
                    include_user=True
                )
                tokens_used = len(message_text.split()) + len(ai_response_text.split())
            except Exception as e:
                ai_response_text = f"Error generating response: {str(e)}. Please check your API key configuration."
                tokens_used = 0
            
            ai_response = AIMessage.objects.create(
                session=session,
                sender='ai',
                message=ai_response_text,
                tokens_used=tokens_used
            )
            
            profile.total_interactions += 1
            profile.total_tokens_used += tokens_used
            profile.save()
            
            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_response': AIMessageSerializer(ai_response).data,
                'model_used': model_type,
                'tokens_used': tokens_used
            })
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get all messages for a session"""
        session = self.get_object()
        messages = AIMessage.objects.filter(session=session).order_by('created_at')
        return Response(AIMessageSerializer(messages, many=True).data)


class CodeAnalysisViewSet(viewsets.ModelViewSet):
    """ViewSet for CodeAnalysis with real AI integration"""
    serializer_class = CodeAnalysisSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return CodeAnalysis.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Analyze code using AI"""
        code = serializer.validated_data.get('code_snippet')
        language = serializer.validated_data.get('language', 'python')
        
        # Get user's preferred model
        profile, _ = AIMentorProfile.objects.get_or_create(user=self.request.user)
        model_type = profile.preferred_ai_model or 'google_gemini'
        
        # Analyze code with AI
        try:
            analysis = analyze_code_with_ai(
                code=code,
                language=language,
                model_type=model_type
            )
            
            serializer.save(
                user=self.request.user,
                analysis_result=analysis.get('analysis', analysis),
                suggestions=analysis.get('suggestions', []),
                complexity_score=analysis.get('complexity_score', 5)
            )
        except Exception as e:
            serializer.save(
                user=self.request.user,
                analysis_result={'error': str(e)},
                suggestions=['Error analyzing code. Please check API configuration.'],
                complexity_score=0
            )


class LearningRecommendationViewSet(viewsets.ModelViewSet):
    """ViewSet for LearningRecommendation"""
    serializer_class = LearningRecommendationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return LearningRecommendation.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate learning recommendations using AI"""
        topic = request.data.get('topic', 'programming')
        level = request.data.get('level', 'beginner')
        
        # Get user's preferred model
        profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
        model_type = profile.preferred_ai_model or 'google_gemini'
        
        # Generate recommendations
        prompt = f"""
        Generate learning recommendations for a {level} student interested in {topic}.
        Provide:
        1. Key concepts to learn
        2. Recommended resources
        3. Practice projects
        4. Learning path
        Format as a structured response.
        """
        
        try:
            recommendations = get_ai_response(prompt, model_type)
            
            # Create recommendation record
            recommendation = LearningRecommendation.objects.create(
                user=request.user,
                topic=topic,
                recommendation_text=recommendations,
                priority='high' if level == 'beginner' else 'medium',
                difficulty_level=level
            )
            
            return Response(LearningRecommendationSerializer(recommendation).data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
