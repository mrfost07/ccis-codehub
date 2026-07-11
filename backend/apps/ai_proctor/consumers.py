"""
AI Proctor WebSocket Consumer — Direct Camera Capture
======================================================
When a student connects, the backend opens the webcam directly via OpenCV
(same as test_model_realtime.py) and runs detection at ~30fps.
No browser frame transfer needed — eliminates black frame issues.
"""
import json
import logging
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .services import AIProctoringService

logger = logging.getLogger(__name__)

# Shared service instance (models lazy-load on first use)
_proctor_service = AIProctoringService()


class ProctoringConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.participant_id = self.scope['url_route']['kwargs']['participant_id']
        self.proctor_group = f'proctor_{self.participant_id}'
        self.join_code = None
        self.nickname = None
        self._camera_started = False

        await self.channel_layer.group_add(self.proctor_group, self.channel_name)
        await self.accept()

        # Lazy-load AI models on first session connect
        _proctor_service.acquire()
        logger.info(f'AI Proctor: session connected for participant {self.participant_id}')

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.proctor_group, self.channel_name)

        # Stop camera thread and clean up
        _proctor_service.release()
        _proctor_service.cleanup_student(self.participant_id)
        self._camera_started = False
        logger.info(f'AI Proctor: session disconnected for participant {self.participant_id}')

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')

        if msg_type == 'start_camera':
            # Student's browser released the camera → start OpenCV capture
            self.join_code = data.get('join_code', self.join_code)
            self.nickname = data.get('nickname', self.nickname)

            if not self._camera_started:
                self._camera_started = True
                logger.info(f'AI Proctor: starting direct camera capture for {self.participant_id}')

                # Get the current event loop for thread-safe callback
                loop = asyncio.get_event_loop()

                def send_result(result):
                    """Thread-safe callback: schedule WS send on the event loop."""
                    asyncio.run_coroutine_threadsafe(
                        self._handle_result(result),
                        loop
                    )

                # Start the camera thread (runs OpenCV capture + detection)
                _proctor_service.start_camera(self.participant_id, send_result)

        elif msg_type == 'frame':
            # Legacy fallback: browser sends base64 frames
            # (kept for compatibility but shouldn't be used anymore)
            self.join_code = data.get('join_code', self.join_code)
            self.nickname = data.get('nickname', self.nickname)
            frame_b64 = data.get('frame', '')
            if not frame_b64:
                return

            logger.info(f'AI Proctor: legacy frame from {self.participant_id} ({len(frame_b64)} bytes)')

    async def _handle_result(self, result):
        """Process a detection result from the camera thread."""
        try:
            result['timestamp'] = timezone.now().isoformat()

            # Send result back to student
            await self.send(text_data=json.dumps({
                'type': 'proctor_result',
                'label': result['label'],
                'confidence': result['confidence'],
                'is_violation': result['is_violation'],
                'calibrating': result.get('calibrating', False),
                'violations': result.get('violations', 0),
                'action': result.get('action', 'none'),
            }))

            # If flagged: log to DB + alert instructor
            if result.get('action') == 'flag' and result.get('is_violation'):
                await self._flag_participant(self.participant_id, result)

                if self.join_code:
                    await self.channel_layer.group_send(
                        f'quiz_{self.join_code}_instructor',
                        {
                            'type': 'instructor_violation_alert',
                            'participant_id': self.participant_id,
                            'violation_type': result['label'],
                            'total_violations': result.get('violations', 0),
                            'confidence': result['confidence'],
                            'is_flagged': True,
                            'nickname': self.nickname or '',
                            'timestamp': result['timestamp'],
                        }
                    )
        except Exception as e:
            # WS might be closed — just log
            logger.debug(f'AI Proctor: failed to send result for {self.participant_id}: {e}')

    @database_sync_to_async
    def _flag_participant(self, participant_id: str, result: dict):
        """Flag the participant in the database when violations are confirmed."""
        try:
            from apps.learning.models import LiveQuizParticipant
            participant = LiveQuizParticipant.objects.get(id=participant_id)
            participant.is_flagged = True
            participant.save(update_fields=['is_flagged'])
            logger.info(
                f'AI Proctor: Flagged participant {participant_id} — '
                f'{result["label"]} (confidence: {result["confidence"]:.1%})'
            )
        except Exception as e:
            logger.warning(f'AI Proctor: Failed to flag participant {participant_id}: {e}')
