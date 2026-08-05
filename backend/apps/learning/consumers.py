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
from asgiref.sync import sync_to_async
from django.utils import timezone

# Participant presence is tracked via Django cache (Redis-backed in production)
# so it works correctly across multiple Daphne/Gunicorn workers.
_PARTICIPANT_CACHE_TTL = 7200  # 2 hours


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
        self.is_instructor = False

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        if self.user and self.user.is_authenticated:
            self.username = self.user.username
            # Auto-register instructors/admins into the instructor group
            role = await self._get_user_role()
            if role in ('instructor', 'admin'):
                self.is_instructor = True
                await self.channel_layer.group_add(self.instructor_group, self.channel_name)
                await self.send_json({'type': 'instructor_registered'})
                await self._broadcast_rich_participants()
            else:
                await self._add_participant(self.username)
                await self._broadcast_participants()
                # Catch-up: send current state so student never gets stuck
                active_q = await self._get_active_question()
                if active_q:
                    await self.send_json({
                        'type': 'question_start',
                        'question': active_q['question'],
                        'timeLimit': active_q['timeLimit'],
                    })
                else:
                    # Fallback: check DB if session is already in_progress
                    session_state = await self._get_session_state()
                    if session_state:
                        if session_state.get('question'):
                            await self.send_json({
                                'type': 'question_start',
                                'question': session_state['question'],
                                'timeLimit': session_state['timeLimit'],
                            })
                        elif session_state.get('status') == 'in_progress':
                            await self.send_json({'type': 'quiz_started'})

    async def disconnect(self, close_code):
        if self.username and not self.is_instructor:
            await self._remove_participant(self.username)
            await self._broadcast_participants()

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.channel_layer.group_discard(self.instructor_group, self.channel_name)

    # ------------------------------------------------------------------ #
    #  Participant tracking helpers                                        #
    # ------------------------------------------------------------------ #

    # ------------------------------------------------------------------ #
    #  Participant tracking helpers (cache-backed, multi-worker-safe)      #
    # ------------------------------------------------------------------ #

    async def _add_participant(self, username: str):
        await self._mutate_participant_cache(username, add=True)

    async def _remove_participant(self, username: str):
        await self._mutate_participant_cache(username, add=False)

    @sync_to_async
    def _mutate_participant_cache(self, username: str, add: bool):
        from django.core.cache import cache
        key = f'quiz_room_{self.room_group_name}'
        participants: set = cache.get(key) or set()
        if add:
            participants.add(username)
        else:
            participants.discard(username)
        cache.set(key, participants, timeout=_PARTICIPANT_CACHE_TTL)

    @sync_to_async
    def _get_participants_cached(self) -> list:
        from django.core.cache import cache
        return list(cache.get(f'quiz_room_{self.room_group_name}') or set())

    @database_sync_to_async
    def _get_rich_participants(self) -> list:
        """Fetch full participant records from DB for instructor display."""
        from .models import LiveQuiz, LiveQuizParticipant
        try:
            quiz = LiveQuiz.objects.get(join_code=self.join_code)
            session = quiz.session
            participants = LiveQuizParticipant.objects.filter(
                session=session, is_active=True
            ).select_related('student').order_by('joined_at')
            return [{
                'id': str(p.id),
                'nickname': p.nickname,
                'total_score': p.total_score,
                'total_correct': p.total_correct,
                'total_attempted': p.total_attempted,
                'fullscreen_violations': p.fullscreen_violations,
                'tab_switch_count': p.tab_switch_count,
                'copy_paste_attempts': p.copy_paste_attempts,
                'is_flagged': p.is_flagged,
                'is_paused': p.is_paused,
                'pause_reason': p.pause_reason or '',
            } for p in participants]
        except Exception:
            return []

    @sync_to_async
    def _get_user_role(self) -> str:
        try:
            profile = self.user.profile
            return profile.role if profile else 'student'
        except Exception:
            return 'student'

    async def _broadcast_participants(self):
        """Broadcast simple username list to room + rich data to instructor group."""
        participants = await self._get_participants_cached()
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'participant_update_handler', 'participants': participants}
        )
        # Also push rich data to instructor group
        await self._broadcast_rich_participants()

    async def _broadcast_rich_participants(self):
        """Push full participant DB records to the instructor group."""
        rich = await self._get_rich_participants()
        await self.channel_layer.group_send(
            self.instructor_group,
            {'type': 'instructor_participant_update', 'participants': rich}
        )

    # ── Active question cache (for late-joining students) ─────────────

    @sync_to_async
    def _cache_active_question(self, question_data, time_limit):
        from django.core.cache import cache
        cache.set(
            f'quiz_active_q_{self.join_code}',
            {'question': question_data, 'timeLimit': time_limit},
            timeout=3600,  # 1 hour
        )

    @sync_to_async
    def _get_active_question(self):
        from django.core.cache import cache
        return cache.get(f'quiz_active_q_{self.join_code}')

    @sync_to_async
    def _clear_active_question(self):
        from django.core.cache import cache
        cache.delete(f'quiz_active_q_{self.join_code}')

    @database_sync_to_async
    def _set_session_in_progress(self):
        from .models import LiveQuiz
        try:
            quiz = LiveQuiz.objects.get(join_code=self.join_code)
            if hasattr(quiz, 'session'):
                session = quiz.session
                if session.status in ('lobby', 'not_started'):
                    session.status = 'in_progress'
                    session.save(update_fields=['status'])
        except Exception:
            pass

    @database_sync_to_async
    def _get_session_state(self):
        """Check DB for current session status and active question (fallback)."""
        from .models import LiveQuiz
        try:
            quiz = LiveQuiz.objects.get(join_code=self.join_code)
            if not hasattr(quiz, 'session'):
                return None
            session = quiz.session
            result = {'status': session.status}
            if session.current_question:
                q = session.current_question
                result['question'] = {
                    'id': str(q.id),
                    'text': q.question_text,
                    'type': 'code' if q.question_type == 'coding' else 'mcq',
                    'questionType': q.question_type,
                    'timeLimit': q.time_limit,
                    'points': q.points,
                    'language': q.programming_language or 'python',
                    'codeTemplate': q.starter_code or '',
                    'testCases': q.test_cases or [],
                }
                result['timeLimit'] = q.time_limit
                # Add MCQ choices if applicable
                if q.question_type == 'multiple_choice':
                    result['question']['choices'] = [
                        c for c in [q.option_a, q.option_b, q.option_c, q.option_d] if c
                    ]
            return result
        except Exception:
            return None

    @database_sync_to_async
    def _save_current_question(self, question_data):
        """Persist the current question to the session model for DB fallback."""
        from .models import LiveQuiz, LiveQuizQuestion
        from django.utils import timezone
        try:
            quiz = LiveQuiz.objects.get(join_code=self.join_code)
            if not hasattr(quiz, 'session'):
                return
            session = quiz.session
            q_id = question_data.get('id') if question_data else None
            if q_id:
                try:
                    question = LiveQuizQuestion.objects.get(id=q_id)
                    session.current_question = question
                    session.current_question_started_at = timezone.now()
                    session.status = 'in_progress'
                    session.save(update_fields=['current_question', 'current_question_started_at', 'status'])
                except LiveQuizQuestion.DoesNotExist:
                    pass
        except Exception:
            pass

    @database_sync_to_async
    def _update_session_status(self, status: str):
        """Persist session status (in_progress / paused / completed) to DB."""
        from .models import LiveQuiz
        try:
            quiz = LiveQuiz.objects.get(join_code=self.join_code)
            if hasattr(quiz, 'session'):
                quiz.session.status = status
                quiz.session.save(update_fields=['status'])
        except Exception:
            pass


    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type')

        # ── Instructor commands ──────────────────────────────────────────
        if msg_type == 'instructor_join':
            # Instructor manually registers (e.g. from Monitor panel)
            self.is_instructor = True
            await self.channel_layer.group_add(self.instructor_group, self.channel_name)
            await self.send_json({'type': 'instructor_registered'})
            # Immediately send current participants
            rich = await self._get_rich_participants()
            await self.send_json({'type': 'instructor_participant_update', 'participants': rich})

        elif msg_type == 'start_quiz':
            # Update session status in DB
            await self._set_session_in_progress()
            await self.channel_layer.group_send(self.room_group_name, {'type': 'quiz_started'})

        elif msg_type == 'next_question':
            question_data = data.get('question')
            time_limit = data.get('timeLimit', 30)
            # Cache + persist the active question so late-joining students get it
            await self._cache_active_question(question_data, time_limit)
            await self._save_current_question(question_data)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'question_start',
                    'question': question_data,
                    'timeLimit': time_limit,
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
            await self._update_session_status('ended')

        elif msg_type == 'pause_session':
            # Instructor pauses the entire session — freezes all students
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'quiz_session_paused',
                'reason': data.get('reason', 'Session paused by instructor'),
            })
            await self._update_session_status('paused')

        elif msg_type == 'resume_session':
            # Instructor resumes the session — unfreezes all students
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'quiz_session_resumed',
            })
            await self._update_session_status('in_progress')

        elif msg_type == 'pause_participant':
            # Instructor manually pauses a specific student. The monitor only
            # knows participant ids (not channel names), so broadcast a targeted
            # pause to the room — each student client matches on participant_id.
            participant_id = data.get('participant_id')
            reason = data.get('reason', 'Paused by instructor')
            if participant_id:
                await self._set_participant_paused(participant_id, True, reason)
                await self.channel_layer.group_send(self.room_group_name, {
                    'type': 'participant_pause_state',
                    'participant_id': str(participant_id),
                    'paused': True,
                    'reason': reason,
                })
                await self._notify_instructor_pause(participant_id, True, reason)

        elif msg_type == 'resume_participant':
            participant_id = data.get('participant_id')
            if participant_id:
                await self._set_participant_paused(participant_id, False)
                await self.channel_layer.group_send(self.room_group_name, {
                    'type': 'participant_pause_state',
                    'participant_id': str(participant_id),
                    'paused': False,
                    'reason': '',
                })
                await self._notify_instructor_pause(participant_id, False, '')

        # ── Student commands ─────────────────────────────────────────────
        elif msg_type == 'request_state':
            # Student asks for current session state (catch-up on connect)
            active_q = await self._get_active_question()
            if active_q:
                await self.send_json({
                    'type': 'question_start',
                    'question': active_q['question'],
                    'timeLimit': active_q['timeLimit'],
                })
            else:
                session_state = await self._get_session_state()
                if session_state:
                    if session_state.get('question'):
                        await self.send_json({
                            'type': 'question_start',
                            'question': session_state['question'],
                            'timeLimit': session_state['timeLimit'],
                        })
                    elif session_state.get('status') == 'in_progress':
                        await self.send_json({'type': 'quiz_started'})

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
            # Clear the pause badge on the instructor monitor
            if participant_id:
                await self._notify_instructor_pause(participant_id, False, '')

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
        # Push updated scores to instructor monitor
        if result.get('success'):
            await self._broadcast_rich_participants()

    async def _handle_submit_code(self, data: dict):
        """Handle coding question submission with test execution."""
        participant_id = data.get('participant_id')
        question_id = data.get('question_id')
        code = data.get('code', '')
        language = data.get('language', 'python')
        response_time = data.get('response_time', 0)
        run_only = data.get('run_only', False)

        result = await self._save_code_response(
            participant_id, question_id, code, language, response_time, run_only
        )
        await self.send_json({'type': 'code_submitted', 'data': result})
        # Push updated scores to instructor monitor (skip for run_only)
        if result.get('success') and not run_only:
            await self._broadcast_rich_participants()

    # ------------------------------------------------------------------ #
    #  Violation enforcement                                               #
    # ------------------------------------------------------------------ #

    async def _handle_violation(self, data: dict):
        participant_id = data.get('participant_id')
        violation_type = data.get('violation_type', 'unknown')

        result = await self._record_violation(participant_id, violation_type)

        # Determine action from quiz settings
        action = result.get('action', 'warn')

        if violation_type in ('fullscreen_exit', 'fullscreen_skip'):
            skipped = violation_type == 'fullscreen_skip'
            if action == 'pause':
                # Pause this student's quiz
                await self._set_participant_paused(
                    participant_id, True, violation_type,
                )
                await self._notify_instructor_pause(
                    participant_id, True,
                    'Declined fullscreen' if skipped else 'Fullscreen exit',
                )
                await self.send_json({
                    'type': 'quiz_paused',
                    'reason': (
                        'Fullscreen is required. Continue to enter it.' if skipped
                        else 'You exited fullscreen. Re-enter to continue.'
                    ),
                })
            elif action == 'close':
                await self.send_json({
                    'type': 'quiz_closed',
                    'reason': 'Session closed: fullscreen violation limit exceeded.',
                })

        elif violation_type == 'tab_switch':
            if action in ('warn', 'pause'):
                # Clients always show the pause overlay on tab switch — record
                # that state so the instructor monitor reflects reality.
                await self._set_participant_paused(participant_id, True, 'tab_switch')
                await self._notify_instructor_pause(participant_id, True, 'Tab switch')
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

        # Flagged-out participants show as paused/closed on the monitor too
        if result.get('is_flagged') and action == 'close':
            await self._notify_instructor_pause(participant_id, True, 'Closed: violation limit')

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

            # Shared scorer — identical to the REST path. (Req 9.)
            from .live_quiz_scoring import score_mcq
            is_correct, points_earned = score_mcq(question, answer_text, response_time)

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
            else:
                # Re-submission: recalculate totals from all responses to avoid drift
                all_responses = LiveQuizResponse.objects.filter(participant=participant)
                participant.total_score = sum(r.points_earned for r in all_responses)
                participant.total_correct = all_responses.filter(is_correct=True).count()
                participant.total_attempted = all_responses.count()
                if participant.total_attempted > 0:
                    participant.average_response_time = (
                        sum(r.response_time_seconds for r in all_responses) / participant.total_attempted
                    )
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
    def _save_code_response(self, participant_id, question_id, code, language, response_time, run_only=False):
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
                # Shared scorer — identical to the REST path. (Req 9.)
                from .live_quiz_scoring import score_coding
                is_correct, points_earned = score_coding(question, exec_result, response_time)
            else:
                # Execution disabled — manual review
                test_results = {'status': 'pending_review', 'results': []}

            # If run_only, return results without saving to DB
            if run_only:
                return {
                    'success': True,
                    'is_correct': is_correct,
                    'points_earned': 0,
                    'test_results': test_results,
                    'run_only': True,
                }

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
            else:
                # Re-submission: recalculate totals from all responses to avoid drift
                all_responses = LiveQuizResponse.objects.filter(participant=participant)
                participant.total_score = sum(r.points_earned for r in all_responses)
                participant.total_correct = all_responses.filter(is_correct=True).count()
                participant.total_attempted = all_responses.count()
                if participant.total_attempted > 0:
                    participant.average_response_time = (
                        sum(r.response_time_seconds for r in all_responses) / participant.total_attempted
                    )
                participant.save()

            # Broadcast updated scores to instructor
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

            # 'fullscreen_skip' is a student declining the fullscreen prompt. It
            # counts as a fullscreen violation — refusing to enter and leaving
            # once you are in are the same thing to a proctor — but keeps its own
            # name on the wire so the instructor's monitor can say which it was.
            # An unrecognised type increments nothing, so it must be listed here
            # or the skip is silently free.
            if violation_type in ('fullscreen_exit', 'fullscreen_skip'):
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
            if violation_type in ('fullscreen_exit', 'fullscreen_skip'):
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
                'type': 'code' if q.question_type == 'coding' else 'mcq',
                'question_type': q.question_type,
                'question_text': q.question_text,
                'text': q.question_text,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
                'choices': [
                    {'id': 'A', 'text': q.option_a},
                    {'id': 'B', 'text': q.option_b},
                    {'id': 'C', 'text': q.option_c},
                    {'id': 'D', 'text': q.option_d},
                ] if q.question_type == 'multiple_choice' else [],
                'time_limit': q.time_limit,
                'timeLimit': q.time_limit,
                'starter_code': q.starter_code or '',
                'codeTemplate': q.starter_code or '',
                'programming_language': q.programming_language or 'python',
                'language': q.programming_language or 'python',
                'points': q.points,
                'test_cases': q.test_cases or [],
                'testCases': q.test_cases or [],
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

    async def instructor_participant_update(self, event):
        """Push rich participant list to instructor connections."""
        await self.send_json({
            'type': 'instructor_participant_update',
            'participants': event['participants'],
        })

    async def quiz_session_paused(self, event):
        """Broadcast session-wide pause to all students."""
        await self.send_json({
            'type': 'session_paused',
            'reason': event.get('reason', 'Session paused by instructor'),
        })

    async def quiz_session_resumed(self, event):
        """Broadcast session-wide resume to all students."""
        await self.send_json({'type': 'session_resumed'})

    async def participant_pause_state(self, event):
        """Targeted pause/resume broadcast — clients match on participant_id."""
        await self.send_json({
            'type': 'participant_pause_state',
            'participant_id': event['participant_id'],
            'paused': event['paused'],
            'reason': event.get('reason', ''),
        })

    async def instructor_participant_pause(self, event):
        """Tell the instructor monitor a participant's pause state changed."""
        await self.send_json({
            'type': 'participant_paused' if event['paused'] else 'participant_resumed',
            'participant_id': event['participant_id'],
            'reason': event.get('reason', ''),
        })

    async def _notify_instructor_pause(self, participant_id, paused: bool, reason: str):
        """Push a pause-state change to the instructor group."""
        await self.channel_layer.group_send(self.instructor_group, {
            'type': 'instructor_participant_pause',
            'participant_id': str(participant_id),
            'paused': paused,
            'reason': reason,
        })
