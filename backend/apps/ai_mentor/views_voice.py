"""
Voice Chat API View
====================
Handles voice chat: receives transcribed text from browser STT,
sends through the existing AI chat pipeline, converts response to speech via ElevenLabs.

STATUS: voice is COMING SOON and disabled by default.

ElevenLabs is a paid service and no key is provisioned in production, so the
endpoints would otherwise fail with a confusing 500/empty audio. They now
return 503 + {"coming_soon": true} so the UI can render a clear state.

To enable: set ELEVENLABS_API_KEY and ENABLE_VOICE_FEATURES=True.
"""
import logging
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.test import APIRequestFactory
from .services.tts_service import tts_service

logger = logging.getLogger(__name__)

COMING_SOON_PAYLOAD = {
    'coming_soon': True,
    'feature': 'voice',
    'error': 'Voice chat is coming soon.',
    'detail': 'Voice replies are not enabled yet. You can keep chatting with the AI mentor by text.',
}


def voice_enabled() -> bool:
    """Voice needs both the feature flag and a configured TTS provider."""
    return bool(
        getattr(settings, 'ENABLE_VOICE_FEATURES', False)
        and tts_service.is_available()
    )


class VoiceStatusView(APIView):
    """
    GET /api/ai/voice/status/
    Lets the frontend render "Coming soon" without probing a failing endpoint.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'enabled': voice_enabled(),
            'coming_soon': not voice_enabled(),
        })


class VoiceChatView(APIView):
    """
    POST /api/ai/voice/
    Accepts transcribed text, routes through existing chat pipeline, returns text + audio.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not voice_enabled():
            return Response(COMING_SOON_PAYLOAD, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return self._handle(request)

    def _handle(self, request):
        transcript = request.data.get('transcript', '').strip()
        session_id = request.data.get('session_id')
        current_page = request.data.get('current_page', '/')

        if not transcript:
            return Response(
                {'error': 'No transcript provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not session_id:
            return Response(
                {'error': 'No session_id provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Reuse the existing send_message endpoint logic
            from .views import ProjectMentorSessionViewSet
            from .models import ProjectMentorSession as MentorSession

            # Verify session belongs to user
            try:
                session = MentorSession.objects.get(
                    id=session_id, user=request.user
                )
            except MentorSession.DoesNotExist:
                return Response(
                    {'error': 'Session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Build an internal request to reuse send_message
            factory = APIRequestFactory()
            internal_request = factory.post(
                f'/api/ai/sessions/{session_id}/send_message/',
                {
                    'message': transcript,
                    'execute_action': True,
                    'current_page': current_page,
                },
                format='json'
            )
            internal_request.user = request.user
            # Copy auth
            internal_request.META['HTTP_AUTHORIZATION'] = request.META.get('HTTP_AUTHORIZATION', '')

            # Call the viewset action directly
            viewset = ProjectMentorSessionViewSet.as_view({'post': 'send_message'})
            response = viewset(internal_request, pk=session_id)

            if response.status_code != 200:
                return Response(
                    {'error': 'AI processing failed', 'details': response.data},
                    status=response.status_code
                )

            # Extract AI response text
            ai_response_data = response.data.get('ai_response', {})
            ai_text = ai_response_data.get('message', "I'm here to help!")
            action_data = response.data.get('action', None)

            # Convert to speech via ElevenLabs
            audio_base64 = None
            if tts_service.is_available:
                clean_for_tts = _strip_markdown_for_tts(ai_text)
                audio_base64 = tts_service.synthesize_base64(clean_for_tts)

            return Response({
                'transcript': transcript,
                'ai_text': ai_text,
                'audio_base64': audio_base64,
                'action': action_data,
                'tts_available': tts_service.is_available,
            })

        except Exception as e:
            logger.error(f'Voice chat error: {e}', exc_info=True)
            return Response(
                {'error': f'Voice chat error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TTSConvertView(APIView):
    """
    POST /api/ai/tts/
    Standalone text-to-speech conversion.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not voice_enabled():
            return Response(COMING_SOON_PAYLOAD, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        text = request.data.get('text', '').strip()
        if not text:
            return Response(
                {'error': 'No text provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # NOTE: is_available is a method — `if not tts_service.is_available`
        # was always False (a bound method is truthy), so an unconfigured
        # provider fell through and returned empty audio instead of a clear flag.
        if not tts_service.is_available():
            return Response({
                'audio_base64': None,
                'tts_available': False,
            })

        clean_text = _strip_markdown_for_tts(text)
        audio_base64 = tts_service.synthesize_base64(clean_text)

        return Response({
            'audio_base64': audio_base64,
            'tts_available': True,
        })


def _strip_markdown_for_tts(text: str) -> str:
    """Remove markdown formatting for cleaner TTS output."""
    import re
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', ' [code block] ', text)
    # Remove inline code
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove bold/italic markers
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    # Remove headers
    text = re.sub(r'^#{1,4}\s+', '', text, flags=re.MULTILINE)
    # Remove bullet points
    text = re.sub(r'^[•\-\*]\s+', '', text, flags=re.MULTILINE)
    # Remove links
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Collapse whitespace
    text = re.sub(r'\n{2,}', '. ', text)
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()
