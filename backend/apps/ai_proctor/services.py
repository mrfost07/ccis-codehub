"""
AI Proctoring Service Stub — Phase 3
======================================
Integration layer for AI-based exam proctoring.

When the computer-vision model is trained and deployed:
  1. Replace `analyze_frame()` implementation with model inference call.
  2. Set the model endpoint in settings (AI_PROCTOR_MODEL_URL).
  3. Set AI_PROCTOR_ENABLED = True in settings.

Frame pipeline:
  Browser webcam → capture frame (canvas) → base64 → WebSocket →
  ProctoringConsumer → AIProctoringService.analyze_frame() → score →
  if score > threshold → flag participant + notify instructor
"""

import base64
import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Suspicion event types ────────────────────────────────────────────────────
EVENTS = {
    'face_not_visible': 'No face detected in frame',
    'multiple_faces': 'Multiple faces detected',
    'looking_away': 'Participant looking away from screen',
    'phone_detected': 'Mobile phone detected',
    'person_left': 'Participant left the frame',
}

SUSPICION_THRESHOLD = 0.65  # If score >= this, flag the participant


class AIProctoringService:
    """
    Stub for AI-based proctoring.

    Replace `analyze_frame()` with actual model inference when
    the fine-tuned computer vision model is ready.
    """

    def analyze_frame(self, frame_base64: str, participant_id: str) -> dict[str, Any]:
        """
        Analyze a single webcam frame for suspicious behavior.

        Args:
            frame_base64: Base64-encoded JPEG/PNG image.
            participant_id: UUID of the participant being proctored.

        Returns:
            {
                'suspicion_score': float (0.0 – 1.0),
                'events': list of detected events,
                'action': 'none' | 'warn' | 'flag',
                'timestamp': ISO timestamp (filled by consumer),
            }

        TODO: Replace this stub with:
            import requests
            resp = requests.post(
                settings.AI_PROCTOR_MODEL_URL + '/predict',
                json={'image': frame_base64, 'participant_id': participant_id},
                timeout=3
            )
            return resp.json()
        """
        # ── STUB: Always returns clean result ──────────────────────────
        return {
            'suspicion_score': 0.0,
            'events': [],
            'action': 'none',
        }

    def should_flag(self, score: float) -> bool:
        return score >= SUSPICION_THRESHOLD
