"""
ElevenLabs Text-to-Speech Service
==================================
Proxies TTS requests through the backend to keep the API key secure.
Falls back to empty audio if the service is unavailable.
"""
import base64
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"

# Default voice — "Bella" (warm, friendly)
# Override with ELEVENLABS_VOICE_ID in .env if you have a preferred voice
DEFAULT_VOICE_ID = "hpp4J3VqNfWAUOO0d1Us"
DEFAULT_MODEL_ID = "eleven_flash_v2_5"


class ElevenLabsTTSService:
    """
    Converts text to speech using the ElevenLabs API.

    Settings required in Django settings:
        ELEVENLABS_API_KEY = "your-api-key"
        ELEVENLABS_VOICE_ID = "voice-id"  (optional, defaults to Rachel)
    """

    def __init__(self):
        self.api_key = getattr(settings, 'ELEVENLABS_API_KEY', None)
        self.voice_id = getattr(settings, 'ELEVENLABS_VOICE_ID', DEFAULT_VOICE_ID)
        self.model_id = getattr(settings, 'ELEVENLABS_MODEL_ID', DEFAULT_MODEL_ID)

    @property
    def is_available(self) -> bool:
        return bool(self.api_key)

    def synthesize(self, text: str, voice_id: str = None) -> bytes | None:
        """
        Convert text to speech audio (MP3 bytes).

        Args:
            text: The text to convert to speech.
            voice_id: Optional voice ID override.

        Returns:
            MP3 audio bytes, or None if the service is unavailable.
        """
        if not self.is_available:
            logger.warning('ElevenLabs: API key not configured, skipping TTS')
            return None

        if not text or not text.strip():
            return None

        # Truncate very long text to avoid API limits
        clean_text = text.strip()
        if len(clean_text) > 5000:
            clean_text = clean_text[:5000] + '...'

        vid = voice_id or self.voice_id

        try:
            response = requests.post(
                f"{ELEVENLABS_BASE_URL}/text-to-speech/{vid}",
                headers={
                    "xi-api-key": self.api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": clean_text,
                    "model_id": self.model_id,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                        "style": 0.0,
                        "use_speaker_boost": True,
                    },
                },
                timeout=30,
            )

            if response.status_code == 200:
                logger.info(f'ElevenLabs: Synthesized {len(clean_text)} chars → {len(response.content)} bytes audio')
                return response.content
            else:
                logger.error(f'ElevenLabs: API returned {response.status_code}: {response.text[:200]}')
                return None

        except requests.Timeout:
            logger.error('ElevenLabs: Request timed out')
            return None
        except Exception as e:
            logger.error(f'ElevenLabs: Error: {e}')
            return None

    def synthesize_base64(self, text: str, voice_id: str = None) -> str | None:
        """Convert text to speech and return as base64-encoded MP3 string."""
        audio_bytes = self.synthesize(text, voice_id)
        if audio_bytes:
            return base64.b64encode(audio_bytes).decode('utf-8')
        return None


# Singleton
tts_service = ElevenLabsTTSService()
