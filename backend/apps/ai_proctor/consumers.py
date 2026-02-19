"""
AI Proctor WebSocket Consumer
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .services import AIProctoringService


class ProctoringConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.participant_id = self.scope['url_route']['kwargs']['participant_id']
        self.proctor_group = f'proctor_{self.participant_id}'
        await self.channel_layer.group_add(self.proctor_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.proctor_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get('type') == 'frame':
            frame = data.get('frame', '')
            result = AIProctoringService().analyze_frame(frame, self.participant_id)
            result['timestamp'] = timezone.now().isoformat()

            # If suspicion score is high enough, flag participant
            if AIProctoringService().should_flag(result['suspicion_score']):
                await self._flag_participant(self.participant_id, result)
                # Notify instructor
                join_code = data.get('join_code', '')
                if join_code:
                    await self.channel_layer.group_send(
                        f'quiz_{join_code}_instructor',
                        {
                            'type': 'instructor_violation_alert',
                            'participant_id': self.participant_id,
                            'violation_type': 'ai_proctor',
                            'total_violations': 1,
                            'is_flagged': True,
                            'nickname': data.get('nickname', ''),
                        }
                    )

            # Acknowledge frame receipt
            await self.send(text_data=json.dumps({
                'type': 'frame_analyzed',
                'result': result,
            }))

    @database_sync_to_async
    def _flag_participant(self, participant_id: str, result: dict):
        try:
            from apps.learning.models import LiveQuizParticipant
            participant = LiveQuizParticipant.objects.get(id=participant_id)
            participant.is_flagged = True
            participant.save(update_fields=['is_flagged'])
        except Exception:
            pass
