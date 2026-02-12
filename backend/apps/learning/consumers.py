import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

# In-memory store for room participants (for simplicity)
# In production, use Redis or database
room_participants = {}


class LiveQuizConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Format: ws/quiz/<join_code>/
        self.join_code = self.scope['url_route']['kwargs']['join_code']
        self.room_group_name = f'quiz_{self.join_code}'
        self.user = self.scope.get('user')
        self.username = None

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # If user is authenticated, register and notify others
        if self.user and self.user.is_authenticated:
            self.username = self.user.username
            await self._add_participant(self.username)
            await self._broadcast_participants()

    async def disconnect(self, close_code):
        # Remove from participants
        if self.username:
            await self._remove_participant(self.username)
            await self._broadcast_participants()
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def _add_participant(self, username):
        """Add participant to room"""
        if self.room_group_name not in room_participants:
            room_participants[self.room_group_name] = set()
        room_participants[self.room_group_name].add(username)

    async def _remove_participant(self, username):
        """Remove participant from room"""
        if self.room_group_name in room_participants:
            room_participants[self.room_group_name].discard(username)

    def _get_participants(self):
        """Get all participants in room"""
        return list(room_participants.get(self.room_group_name, []))

    async def _broadcast_participants(self):
        """Broadcast updated participant list to all in room"""
        participants = self._get_participants()
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'participant_update_handler',
                'participants': participants
            }
        )

    @database_sync_to_async
    def _save_response(self, participant_id, question_id, answer_text, response_time):
        """Save student response to database"""
        from .models import LiveQuizResponse, LiveQuizParticipant, LiveQuizQuestion
        
        try:
            participant = LiveQuizParticipant.objects.get(id=participant_id)
            question = LiveQuizQuestion.objects.get(id=question_id)
            
            # Check if correct
            is_correct = answer_text.upper() == question.correct_answer.upper()
            
            # Calculate points (with time bonus if applicable)
            points_earned = 0
            if is_correct:
                points_earned = question.points
                if question.time_bonus_enabled and response_time < question.time_limit:
                    # Time bonus: more points for faster answers
                    time_ratio = 1 - (response_time / question.time_limit)
                    bonus = int(question.points * 0.5 * time_ratio)
                    points_earned += bonus
            
            # Create or update response
            response, created = LiveQuizResponse.objects.update_or_create(
                participant=participant,
                question=question,
                defaults={
                    'answer_text': answer_text,
                    'is_correct': is_correct,
                    'response_time_seconds': response_time,
                    'points_earned': points_earned,
                    'submitted_at': timezone.now()
                }
            )
            
            # Update participant totals
            if created:
                participant.total_attempted += 1
                if is_correct:
                    participant.total_correct += 1
                participant.total_score += points_earned
                participant.save()
            
            return {
                'success': True,
                'is_correct': is_correct,
                'points_earned': points_earned,
                'correct_answer': question.correct_answer if not is_correct else None
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # --- Instructor Commands ---
            if message_type == 'start_quiz':
                # Broadcast start event
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'quiz_started',
                    }
                )
            
            elif message_type == 'next_question':
                # Broadcast next question
                question_data = data.get('question')
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'question_start',
                        'question': question_data,
                        'timeLimit': data.get('timeLimit', 30)
                    }
                )
            
            elif message_type == 'end_question':
                # Broadcast correct answer/results
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'question_end',
                        'correctAnswer': data.get('correctAnswer'),
                        'points': data.get('points', 100)
                    }
                )

            elif message_type == 'end_quiz':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'quiz_end'
                    }
                )

            # --- Student Commands ---
            elif message_type == 'join':
                # Handle explicit join with nickname
                username = data.get('nickname') or data.get('message', 'Anonymous')
                self.username = username
                await self._add_participant(username)
                await self._broadcast_participants()

            elif message_type == 'submit_answer':
                # Save answer to database and acknowledge
                participant_id = data.get('participant_id')
                question_id = data.get('question_id')
                answer_text = data.get('answer')
                response_time = data.get('response_time', 0)
                
                result = await self._save_response(
                    participant_id, question_id, answer_text, response_time
                )
                
                # Send acknowledgement back to student
                await self.send(text_data=json.dumps({
                    'type': 'answer_submitted',
                    'data': result
                }))

            elif message_type == 'report_violation':
                # Handle anti-cheating violation reports from frontend
                participant_id = data.get('participant_id')
                violation_type = data.get('violation_type', 'unknown')
                
                result = await self._record_violation(participant_id, violation_type)
                
                # Send violation acknowledgement back to student
                await self.send(text_data=json.dumps({
                    'type': 'violation_recorded',
                    'data': result
                }))
                
        except json.JSONDecodeError:
            pass

    @database_sync_to_async
    def _record_violation(self, participant_id, violation_type):
        """Record a violation on the participant's record"""
        from .models import LiveQuizParticipant
        
        try:
            participant = LiveQuizParticipant.objects.select_related(
                'session__quiz'
            ).get(id=participant_id)
            
            # Increment the appropriate counter
            if violation_type == 'fullscreen_exit':
                participant.fullscreen_violations += 1
            elif violation_type == 'tab_switch':
                participant.tab_switch_count += 1
            elif violation_type == 'copy_paste':
                participant.copy_paste_attempts += 1
            
            total_violations = (
                participant.fullscreen_violations +
                participant.tab_switch_count +
                participant.copy_paste_attempts
            )
            
            # Check max violations threshold
            quiz = participant.session.quiz
            max_violations = quiz.max_violations or 0
            penalty = quiz.violation_penalty_points or 0
            
            # Apply penalty points per violation
            if penalty > 0:
                participant.total_score = max(0, participant.total_score - penalty)
            
            # Auto-flag if exceeded max
            if max_violations > 0 and total_violations >= max_violations:
                participant.is_flagged = True
            
            participant.save()
            
            return {
                'success': True,
                'total_violations': total_violations,
                'is_flagged': participant.is_flagged,
                'max_violations': max_violations,
                'penalty_applied': penalty
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # --- Event Handlers ---

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender': event.get('sender', 'System')
        }))

    async def participant_update_handler(self, event):
        """Handle participant list updates - sends full list"""
        await self.send(text_data=json.dumps({
            'type': 'participant_update',
            'data': {
                'participants': event['participants'],
                'count': len(event['participants'])
            }
        }))

    async def quiz_started(self, event):
        await self.send(text_data=json.dumps({
            'type': 'quiz_started'
        }))

    async def question_start(self, event):
        await self.send(text_data=json.dumps({
            'type': 'question_start',
            'question': event['question'],
            'timeLimit': event['timeLimit']
        }))

    async def question_end(self, event):
        await self.send(text_data=json.dumps({
            'type': 'question_end',
            'correctAnswer': event['correctAnswer'],
            'points': event['points']
        }))
        
    async def quiz_end(self, event):
        await self.send(text_data=json.dumps({
            'type': 'quiz_end'
        }))

