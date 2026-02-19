"""
Live Quiz System — WebSocket Consumer (Phase 2)
=================================================
Handles real-time quiz events, anti-cheat enforcement, and code execution.

Groups:
  quiz_{join_code}            — all participants
  quiz_{join_code}_instructor — instructor(s) only (violation alerts, telemetry)
"""

import json
import random
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

# In-memory connected-channel tracking (keyed by join_code).
# In production, back with Redis via channels_redis.
room_participants: dict[str, set] = {}


class LiveQuizConsumer(AsyncWebsocketConsumer):
    # ------------------------------------------------------------------ #
    #  Connection lifecycle                                                #
    # ------------------------------------------------------------------ #

    async def connect(self):
        self.join_code = self.scope['url_route']['kwargs']['join_code']
        self.room_group_name = f'quiz_{self.join_code}'
        self.instructor_group = f'quiz_{self.join_code}_instructor'
        self.user = self.scope.get('user')
        self.username = None

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        if self.user and self.user.is_authenticated:
            self.username = self.user.username
            await self._add_participant(self.username)
            await self._broadcast_participants()

    async def disconnect(self, close_code):
        if self.username:
            await self._remove_participant(self.username)
            await self._broadcast_participants()

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        # Discard from instructor group as well (no-op if not in it)
        await self.channel_layer.group_discard(self.instructor_group, self.channel_name)

    # ------------------------------------------------------------------ #
    #  Participant tracking helpers                                        #
    # ------------------------------------------------------------------ #

    async def _add_participant(self, username: str):
        room_participants.setdefault(self.room_group_name, set()).add(username)

    async def _remove_participant(self, username: str):
        if self.room_group_name in room_participants:
            room_participants[self.room_group_name].discard(username)

    def _get_participants(self) -> list:
        return list(room_participants.get(self.room_group_name, []))

    async def _broadcast_participants(self):
        participants = self._get_participants()
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'participant_update_handler', 'participants': participants}
        )

    # ------------------------------------------------------------------ #
    #  Message router                                                      #
    # ------------------------------------------------------------------ #

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')

        # ── Instructor commands ──────────────────────────────────────────
        if msg_type == 'instructor_join':
            # Instructor registers to receive violation alerts
            await self.channel_layer.group_add(self.instructor_group, self.channel_name)
            await self.send_json({'type': 'instructor_registered'})

        elif msg_type == 'start_quiz':
            await self.channel_layer.group_send(self.room_group_name, {'type': 'quiz_started'})

        elif msg_type == 'next_question':
            question_data = data.get('question')
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'question_start',
                    'question': question_data,
                    'timeLimit': data.get('timeLimit', 30),
                }
            )

        elif msg_type == 'end_question':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'question_end',
                    'correctAnswer': data.get('correctAnswer'),
                    'points': data.get('points', 100),
                }
            )

        elif msg_type == 'end_quiz':
            await self.channel_layer.group_send(self.room_group_name, {'type': 'quiz_end'})

        elif msg_type == 'pause_participant':
            # Instructor manually pauses a specific student
            target_channel = data.get('channel_name')
            if target_channel:
                await self.channel_layer.send(
                    target_channel,
                    {'type': 'quiz_paused', 'reason': data.get('reason', 'Paused by instructor')}
                )

        elif msg_type == 'resume_participant':
            target_channel = data.get('channel_name')
            if target_channel:
                await self.channel_layer.send(target_channel, {'type': 'quiz_resumed'})

        # ── Student commands ─────────────────────────────────────────────
        elif msg_type == 'join':
            username = data.get('nickname') or 'Anonymous'
            self.username = username
            await self._add_participant(username)
            await self._broadcast_participants()

        elif msg_type == 'submit_answer':
            await self._handle_submit_answer(data)

        elif msg_type == 'submit_code':
            await self._handle_submit_code(data)

        elif msg_type == 'report_violation':
            await self._handle_violation(data)

        elif msg_type == 'resume_from_fullscreen':
            # Student re-entered fullscreen — confirm they can continue
            participant_id = data.get('participant_id')
            await self._set_participant_paused(participant_id, False)
            await self.send_json({'type': 'quiz_resumed'})

    # ------------------------------------------------------------------ #
    #  Answer submission                                                   #
    # ------------------------------------------------------------------ #

    async def _handle_submit_answer(self, data: dict):
        participant_id = data.get('participant_id')
        question_id = data.get('question_id')
        answer_text = data.get('answer', '')
        response_time = data.get('response_time', 0)

        result = await self._save_mcq_response(
            participant_id, question_id, answer_text, response_time
        )
        await self.send_json({'type': 'answer_submitted', 'data': result})

    async def _handle_submit_code(self, data: dict):
        """Handle coding question submission with test execution."""
        participant_id = data.get('participant_id')
        question_id = data.get('question_id')
        code = data.get('code', '')
        language = data.get('language', 'python')
        response_time = data.get('response_time', 0)

        result = await self._save_code_response(
            participant_id, question_id, code, language, response_time
        )
        await self.send_json({'type': 'code_submitted', 'data': result})

    # ------------------------------------------------------------------ #
    #  Violation enforcement                                               #
    # ------------------------------------------------------------------ #

    async def _handle_violation(self, data: dict):
        participant_id = data.get('participant_id')
        violation_type = data.get('violation_type', 'unknown')

        result = await self._record_violation(participant_id, violation_type)

        # Determine action from quiz settings
        action = result.get('action', 'warn')

        if violation_type == 'fullscreen_exit':
            if action == 'pause':
                # Pause this student's quiz
                await self._set_participant_paused(participant_id, True, 'fullscreen_exit')
                await self.send_json({
                    'type': 'quiz_paused',
                    'reason': 'You exited fullscreen. Re-enter to continue.',
                })
            elif action == 'close':
                await self.send_json({
                    'type': 'quiz_closed',
                    'reason': 'Session closed: fullscreen violation limit exceeded.',
                })

        elif violation_type == 'tab_switch':
            if action == 'shuffle':
                # Pick a random question from the quiz and send it
                shuffled_q = await self._get_random_question(participant_id)
                if shuffled_q:
                    await self.send_json({
                        'type': 'question_shuffle',
                        'question': shuffled_q,
                    })
            elif action == 'close':
                await self.send_json({
                    'type': 'quiz_closed',
                    'reason': 'Session closed: focus violation limit exceeded.',
                })

        # Always acknowledge with violation summary
        await self.send_json({'type': 'violation_recorded', 'data': result})

        # Notify instructor group
        await self.channel_layer.group_send(
            self.instructor_group,
            {
                'type': 'instructor_violation_alert',
                'participant_id': str(participant_id),
                'violation_type': violation_type,
                'total_violations': result.get('total_violations', 0),
                'is_flagged': result.get('is_flagged', False),
                'nickname': result.get('nickname', ''),
            }
        )

    # ------------------------------------------------------------------ #
    #  Database operations                                                 #
    # ------------------------------------------------------------------ #

    @database_sync_to_async
    def _save_mcq_response(self, participant_id, question_id, answer_text, response_time):
        from .models import LiveQuizResponse, LiveQuizParticipant, LiveQuizQuestion
        try:
            participant = LiveQuizParticipant.objects.get(id=participant_id)
            question = LiveQuizQuestion.objects.get(id=question_id)

            is_correct = answer_text.strip().upper() == question.correct_answer.strip().upper()
            points_earned = 0
            if is_correct:
                points_earned = question.points
                if question.time_bonus_enabled and response_time < question.time_limit:
                    time_ratio = 1 - (response_time / question.time_limit)
                    points_earned += int(question.points * 0.5 * time_ratio)

            response, created = LiveQuizResponse.objects.update_or_create(
                participant=participant,
                question=question,
                defaults={
                    'answer_text': answer_text,
                    'is_correct': is_correct,
                    'response_time_seconds': response_time,
                    'points_earned': points_earned,
                }
            )

            if created:
                participant.total_attempted += 1
                if is_correct:
                    participant.total_correct += 1
                participant.total_score += points_earned
                # Update rolling average
                total_time = (
                    participant.average_response_time * (participant.total_attempted - 1)
                    + response_time
                )
                participant.average_response_time = total_time / participant.total_attempted
                participant.save()

            return {
                'success': True,
                'is_correct': is_correct,
                'points_earned': points_earned,
                'correct_answer': question.correct_answer if not is_correct else None,
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @database_sync_to_async
    def _save_code_response(self, participant_id, question_id, code, language, response_time):
        """Execute code against test cases and save response."""
        from .models import LiveQuizResponse, LiveQuizParticipant, LiveQuizQuestion
        from .code_executor import CodeExecutor

        try:
            participant = LiveQuizParticipant.objects.get(id=participant_id)
            question = LiveQuizQuestion.objects.get(id=question_id)

            # Check if code execution is enabled
            enable_exec = getattr(question.quiz, 'enable_code_execution', True)
            test_results = {}
            is_correct = False
            points_earned = 0

            if enable_exec and question.test_cases:
                executor = CodeExecutor()
                exec_result = executor.run(
                    language=language or question.programming_language or 'python',
                    code=code,
                    test_cases=question.test_cases,
                )
                test_results = exec_result
                passed_ratio = exec_result.get('passed', 0) / max(exec_result.get('total', 1), 1)
                is_correct = exec_result.get('all_passed', False)
                # Partial credit: proportional to tests passed
                points_earned = int(question.points * passed_ratio)
                if is_correct and question.time_bonus_enabled and response_time < question.time_limit:
                    time_ratio = 1 - (response_time / question.time_limit)
                    points_earned += int(question.points * 0.3 * time_ratio)
            else:
                # Execution disabled — manual review
                test_results = {'status': 'pending_review', 'results': []}

            response, created = LiveQuizResponse.objects.update_or_create(
                participant=participant,
                question=question,
                defaults={
                    'answer_text': '',
                    'code_submission': code,
                    'test_results': test_results,
                    'is_correct': is_correct,
                    'points_earned': points_earned,
                    'response_time_seconds': response_time,
                }
            )

            if created:
                participant.total_attempted += 1
                if is_correct:
                    participant.total_correct += 1
                participant.total_score += points_earned
                total_time = (
                    participant.average_response_time * (participant.total_attempted - 1)
                    + response_time
                )
                participant.average_response_time = total_time / participant.total_attempted
                participant.save()

            return {
                'success': True,
                'is_correct': is_correct,
                'points_earned': points_earned,
                'test_results': test_results,
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @database_sync_to_async
    def _record_violation(self, participant_id, violation_type):
        from .models import LiveQuizParticipant
        try:
            participant = LiveQuizParticipant.objects.select_related(
                'session__quiz'
            ).get(id=participant_id)

            if violation_type == 'fullscreen_exit':
                participant.fullscreen_violations += 1
            elif violation_type == 'tab_switch':
                participant.tab_switch_count += 1
            elif violation_type == 'copy_paste':
                participant.copy_paste_attempts += 1

            total_violations = (
                participant.fullscreen_violations
                + participant.tab_switch_count
                + participant.copy_paste_attempts
            )

            quiz = participant.session.quiz
            max_violations = quiz.max_violations or 0
            penalty = quiz.violation_penalty_points or 0

            if penalty > 0:
                participant.total_score = max(0, participant.total_score - penalty)

            if max_violations > 0 and total_violations >= max_violations:
                participant.is_flagged = True

            participant.save()

            # Determine what action to take
            action = 'warn'
            if violation_type == 'fullscreen_exit':
                action = quiz.fullscreen_exit_action
            elif violation_type == 'tab_switch':
                action = quiz.alt_tab_action

            # Override to close if flagged and at max violations
            if participant.is_flagged and max_violations > 0 and total_violations >= max_violations:
                if action == 'shuffle':
                    action = 'close'  # Can't shuffle if flagged out

            return {
                'success': True,
                'action': action,
                'total_violations': total_violations,
                'is_flagged': participant.is_flagged,
                'max_violations': max_violations,
                'penalty_applied': penalty,
                'nickname': participant.nickname,
            }
        except Exception as e:
            return {'success': False, 'error': str(e), 'action': 'warn'}

    @database_sync_to_async
    def _set_participant_paused(self, participant_id, paused: bool, reason: str = ''):
        from .models import LiveQuizParticipant
        try:
            participant = LiveQuizParticipant.objects.get(id=participant_id)
            participant.is_paused = paused
            participant.pause_reason = reason if paused else ''
            participant.save(update_fields=['is_paused', 'pause_reason'])
        except Exception:
            pass

    @database_sync_to_async
    def _get_random_question(self, participant_id):
        """Pick a random question from the quiz excluding already-answered ones."""
        from .models import LiveQuizParticipant, LiveQuizQuestion, LiveQuizResponse
        try:
            participant = LiveQuizParticipant.objects.select_related('session__quiz').get(
                id=participant_id
            )
            answered_ids = LiveQuizResponse.objects.filter(
                participant=participant
            ).values_list('question_id', flat=True)

            unanswered = LiveQuizQuestion.objects.filter(
                quiz=participant.session.quiz
            ).exclude(id__in=answered_ids)

            if not unanswered.exists():
                return None

            q = random.choice(list(unanswered))
            return {
                'id': str(q.id),
                'type': q.question_type,
                'text': q.question_text,
                'choices': [
                    {'id': 'A', 'text': q.option_a},
                    {'id': 'B', 'text': q.option_b},
                    {'id': 'C', 'text': q.option_c},
                    {'id': 'D', 'text': q.option_d},
                ] if q.question_type == 'multiple_choice' else [],
                'timeLimit': q.time_limit,
                'codeTemplate': q.starter_code,
                'language': q.programming_language,
                'points': q.points,
            }
        except Exception:
            return None

    # ------------------------------------------------------------------ #
    #  Utility                                                             #
    # ------------------------------------------------------------------ #

    async def send_json(self, content: dict):
        await self.send(text_data=json.dumps(content))

    # ------------------------------------------------------------------ #
    #  Event handlers (channel layer → WebSocket send)                    #
    # ------------------------------------------------------------------ #

    async def chat_message(self, event):
        await self.send_json({
            'type': 'chat_message',
            'message': event['message'],
            'sender': event.get('sender', 'System'),
        })

    async def participant_update_handler(self, event):
        await self.send_json({
            'type': 'participant_update',
            'data': {
                'participants': event['participants'],
                'count': len(event['participants']),
            }
        })

    async def quiz_started(self, event):
        await self.send_json({'type': 'quiz_started'})

    async def question_start(self, event):
        await self.send_json({
            'type': 'question_start',
            'question': event['question'],
            'timeLimit': event['timeLimit'],
        })

    async def question_end(self, event):
        await self.send_json({
            'type': 'question_end',
            'correctAnswer': event['correctAnswer'],
            'points': event['points'],
        })

    async def quiz_end(self, event):
        await self.send_json({'type': 'quiz_end'})

    async def quiz_paused(self, event):
        await self.send_json({
            'type': 'quiz_paused',
            'reason': event.get('reason', 'Quiz paused'),
        })

    async def quiz_resumed(self, event):
        await self.send_json({'type': 'quiz_resumed'})

    async def quiz_closed(self, event):
        await self.send_json({
            'type': 'quiz_closed',
            'reason': event.get('reason', 'Session closed'),
        })

    async def instructor_violation_alert(self, event):
        """Send violation alerts to instructors only."""
        await self.send_json({
            'type': 'violation_alert',
            'participant_id': event['participant_id'],
            'violation_type': event['violation_type'],
            'total_violations': event['total_violations'],
            'is_flagged': event['is_flagged'],
            'nickname': event['nickname'],
        })
