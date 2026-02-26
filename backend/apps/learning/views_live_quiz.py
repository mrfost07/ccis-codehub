"""
Live Quiz System - API Views
REST API endpoints for quiz management, sessions, and student participation
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.learning.models import (
    LiveQuiz,
    LiveQuizQuestion,
    LiveQuizSession,
    LiveQuizParticipant,
    LiveQuizResponse
)
from apps.learning.serializers_live_quiz import (
    LiveQuizSerializer,
    LiveQuizCreateSerializer,
    LiveQuizQuestionSerializer,
    LiveQuizSessionSerializer,
    LiveQuizParticipantSerializer,
    LiveQuizResponseSerializer,
    LeaderboardEntrySerializer,
    QuizResultsSerializer
)
from apps.core.permissions import IsInstructorOrAdmin


class LiveQuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing live quizzes
    Instructors can create, update, and manage quizzes
    """
    queryset = LiveQuiz.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LiveQuizCreateSerializer
        return LiveQuizSerializer
    
    def get_queryset(self):
        """Filter quizzes based on user role"""
        user = self.request.user
        if user.role in ['instructor', 'admin']:
            # Instructors see their own quizzes
            return LiveQuiz.objects.filter(instructor=user).order_by('-created_at')
        # Students don't see quiz list
        return LiveQuiz.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create quiz and return full serialized response with join_code"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = serializer.save()
        # Return full response using LiveQuizSerializer (includes join_code, id, etc.)
        response_serializer = LiveQuizSerializer(quiz, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], permission_classes=[IsInstructorOrAdmin])
    def start(self, request, pk=None):
        """Start a live quiz session"""
        quiz = self.get_object()

        # Check if quiz has questions first
        if quiz.live_questions.count() == 0:
            return Response(
                {'error': 'Quiz must have at least one question'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create session — join_by_code may have already created a lobby session
        try:
            session = quiz.session
            if session.status == 'in_progress':
                return Response(
                    {'error': 'Quiz is already in progress'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if session.status == 'ended':
                # Old ended session — delete and create a fresh lobby
                session.delete()
                initial_status = 'in_progress' if quiz.quiz_mode == 'self_paced' else 'lobby'
                session = LiveQuizSession.objects.create(quiz=quiz, status=initial_status)
            # else: status == 'lobby' — reuse it (students may already be waiting)
            # For self_paced, immediately set to in_progress
            if quiz.quiz_mode == 'self_paced' and session.status == 'lobby':
                session.status = 'in_progress'
                session.save(update_fields=['status'])
        except LiveQuizSession.DoesNotExist:
            initial_status = 'in_progress' if quiz.quiz_mode == 'self_paced' else 'lobby'
            session = LiveQuizSession.objects.create(quiz=quiz, status=initial_status)

        # Mark quiz as active
        quiz.is_active = True
        quiz.started_at = timezone.now()
        quiz.save(update_fields=['is_active', 'started_at'])

        serializer = LiveQuizSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

    
    @action(detail=True, methods=['post'], permission_classes=[IsInstructorOrAdmin])
    def end(self, request, pk=None):
        """End a live quiz session"""
        quiz = self.get_object()
        
        if not hasattr(quiz, 'session'):
            return Response(
                {'error': 'No active session found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        session = quiz.session
        session.status = 'ended'
        session.save(update_fields=['status'])

        # Mark quiz as inactive (inline — no helper method needed)
        quiz.is_active = False
        quiz.save(update_fields=['is_active'])

        # Generate results
        results = self._generate_results(session)
        
        return Response(results, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def join_info(self, request):
        """Get quiz info for students joining — looked up by join_code query param"""
        join_code = request.query_params.get('join_code', '').upper()
        if not join_code:
            return Response({'error': 'join_code query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quiz = LiveQuiz.objects.get(join_code=join_code)
        except LiveQuiz.DoesNotExist:
            return Response({'error': 'Invalid join code'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': quiz.id,
            'title': quiz.title,
            'description': quiz.description,
            'quiz_mode': quiz.quiz_mode,
            'instructor_name': f'{quiz.instructor.first_name or ""} {quiz.instructor.last_name or ""}'.strip() or quiz.instructor.username,
            'require_fullscreen': quiz.require_fullscreen,
            'fullscreen_exit_action': quiz.fullscreen_exit_action,
            'alt_tab_action': quiz.alt_tab_action,
            'enable_ai_proctor': quiz.enable_ai_proctor,
            'enable_code_execution': quiz.enable_code_execution,
            'max_violations': quiz.max_violations,
            'violation_penalty_points': quiz.violation_penalty_points,
            'max_participants': quiz.max_participants,
            'questions_count': quiz.live_questions.count(),
            'time_limit_minutes': quiz.time_limit_minutes,
            'deadline': quiz.deadline.isoformat() if quiz.deadline else None,
        })
    
    @action(detail=False, methods=['post'])
    def join_by_code(self, request):
        """Allow students to join quiz by entering join code"""
        join_code = request.data.get('join_code', '').upper()
        nickname = request.data.get('nickname', '')
        
        if not join_code or not nickname:
            return Response(
                {'error': 'Join code and nickname are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quiz = LiveQuiz.objects.get(join_code=join_code)
        except LiveQuiz.DoesNotExist:
            return Response(
                {'error': 'Invalid join code'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check scheduling and retakes
        can_attempt, message = quiz.can_student_attempt(request.user)
        if not can_attempt:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create session
        try:
            session = quiz.session
            if session.status == 'ended':
                if quiz.quiz_mode == 'self_paced':
                    # Self-paced: create a new session for this student
                    session.delete()
                    session = LiveQuizSession.objects.create(quiz=quiz, status='in_progress')
                else:
                    return Response(
                        {'error': 'This quiz session has already ended'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except LiveQuizSession.DoesNotExist:
            # Auto-create session
            initial_status = 'in_progress' if quiz.quiz_mode == 'self_paced' else 'lobby'
            session = LiveQuizSession.objects.create(quiz=quiz, status=initial_status)

        # Check late join policy (live mode only — self_paced always allows join)
        if quiz.quiz_mode == 'live' and session.status not in ('lobby',) and not quiz.allow_late_join:
            return Response(
                {'error': 'Quiz has already started and late join is not allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check max participants
        if session.participants.filter(is_active=True).count() >= quiz.max_participants:
            return Response(
                {'error': 'Quiz is full'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already joined
        participant, created = LiveQuizParticipant.objects.get_or_create(
            session=session,
            student=request.user,
            defaults={'nickname': nickname}
        )
        
        if not created and participant.left_at:
            # Rejoin
            participant.is_active = True
            participant.left_at = None
            participant.save()
        
        # Update participant count
        session.total_participants = session.participants.count()
        session.active_participants = session.participants.filter(is_active=True).count()
        session.save(update_fields=['total_participants', 'active_participants'])
        
        response_data = {
            'quiz_id': str(quiz.id),
            'session_id': str(session.id),
            'participant_id': str(participant.id),
            'quiz_mode': quiz.quiz_mode,
            'attempts_message': message,
            'time_limit_minutes': quiz.time_limit_minutes,
            'quiz_info': LiveQuizSerializer(quiz, context={'request': request}).data
        }
        
        # For self-paced mode, include all questions so student can work independently
        if quiz.quiz_mode == 'self_paced':
            questions = quiz.live_questions.all().order_by('order')
            if quiz.shuffle_questions:
                questions = list(questions)
                import random
                random.shuffle(questions)
            response_data['questions'] = [
                {
                    'id': str(q.id),
                    'order': idx + 1,
                    'question_text': q.question_text,
                    'question_type': q.question_type,
                    'image_url': q.image_url or '',
                    'option_a': q.option_a or '',
                    'option_b': q.option_b or '',
                    'option_c': q.option_c or '',
                    'option_d': q.option_d or '',
                    'points': q.points,
                    'time_limit': q.time_limit,
                    'time_bonus_enabled': q.time_bonus_enabled,
                    'programming_language': q.programming_language or '',
                    'starter_code': q.starter_code or '',
                    'test_cases': q.test_cases or [],
                } for idx, q in enumerate(questions)
            ]
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _generate_results(self, session):
        """Generate final quiz results"""
        participants = session.participants.filter(is_active=True).order_by(
            '-total_score', 'average_response_time'
        )
        
        leaderboard = []
        for rank, participant in enumerate(participants, 1):
            leaderboard.append({
                'rank': rank,
                'participant_id': str(participant.id),
                'nickname': participant.nickname,
                'total_score': participant.total_score,
                'total_correct': participant.total_correct,
                'total_attempted': participant.total_attempted,
                'average_response_time': participant.average_response_time,
                'is_flagged': participant.is_flagged
            })
        
        avg_score = participants.aggregate(Avg('total_score'))['total_score__avg'] or 0
        total_questions = session.quiz.live_questions.count()
        completion_rate = (participants.filter(
            total_attempted=total_questions
        ).count() / max(participants.count(), 1)) * 100
        
        return {
            'quiz_id': str(session.quiz.id),
            'quiz_title': session.quiz.title,
            'total_participants': session.total_participants,
            'total_questions': total_questions,
            'leaderboard': leaderboard,
            'average_score': round(avg_score, 2),
            'completion_rate': round(completion_rate, 2)
        }
    
    @action(detail=True, methods=['get'])
    def final_overview(self, request, pk=None):
        """Get comprehensive results - available after deadline or when quiz ends"""
        quiz = self.get_object()
        
        # Get all participants across all sessions
        all_participants = LiveQuizParticipant.objects.filter(
            session__quiz=quiz
        ).select_related('student', 'session').order_by('-total_score', 'average_response_time')
        
        # Build leaderboard with student details
        leaderboard = []
        for rank, participant in enumerate(all_participants, 1):
            leaderboard.append({
                'rank': rank,
                'participant_id': str(participant.id),
                'nickname': participant.nickname,
                'student_name': (f'{participant.student.first_name or ""} {participant.student.last_name or ""}'.strip() or participant.student.username) if participant.student else 'Anonymous',
                'student_email': participant.student.email if participant.student else None,
                'total_score': participant.total_score,
                'total_correct': participant.total_correct,
                'total_attempted': participant.total_attempted,
                'accuracy': round((participant.total_correct / max(participant.total_attempted, 1)) * 100, 1),
                'average_response_time': round(participant.average_response_time, 2),
                'violations': participant.fullscreen_violations + participant.tab_switch_count,
                'is_flagged': participant.is_flagged,
                'joined_at': participant.joined_at.isoformat() if participant.joined_at else None,
                'completed_at': participant.left_at.isoformat() if participant.left_at else None
            })
        
        # Aggregate stats
        total_questions = quiz.live_questions.count()
        total_participants = all_participants.count()
        avg_score = all_participants.aggregate(Avg('total_score'))['total_score__avg'] or 0
        avg_accuracy = all_participants.aggregate(Avg('total_correct'))['total_correct__avg'] or 0
        
        # Per-question analytics
        question_analytics = []
        questions = quiz.live_questions.all().order_by('order')
        for question in questions:
            responses = LiveQuizResponse.objects.filter(
                question=question,
                participant__session__quiz=quiz
            )
            total_responses = responses.count()
            correct_count = responses.filter(is_correct=True).count()
            avg_time = responses.aggregate(Avg('response_time_seconds'))['response_time_seconds__avg'] or 0
            
            # Answer distribution for MCQ/True-False
            answer_distribution = {}
            if question.question_type in ('multiple_choice', 'true_false'):
                for opt_key in ['A', 'B', 'C', 'D']:
                    count = responses.filter(answer_text__iexact=opt_key).count()
                    if count > 0:
                        answer_distribution[opt_key] = count
            
            question_analytics.append({
                'question_id': str(question.id),
                'order': question.order,
                'question_text': question.question_text[:100],
                'question_type': question.question_type,
                'correct_answer': question.correct_answer,
                'points': question.points,
                'total_responses': total_responses,
                'correct_count': correct_count,
                'correct_rate': round((correct_count / max(total_responses, 1)) * 100, 1),
                'average_response_time': round(avg_time, 2),
                'answer_distribution': answer_distribution
            })
        
        # Find hardest and easiest questions
        if question_analytics:
            sorted_by_rate = sorted(question_analytics, key=lambda q: q['correct_rate'])
            hardest = sorted_by_rate[0] if sorted_by_rate else None
            easiest = sorted_by_rate[-1] if sorted_by_rate else None
        else:
            hardest = easiest = None
        
        return Response({
            'quiz': {
                'id': str(quiz.id),
                'title': quiz.title,
                'join_code': quiz.join_code,
                'is_open': quiz.is_open(),
                'status_text': quiz.get_status_text(),
                'scheduled_start': quiz.scheduled_start.isoformat() if quiz.scheduled_start else None,
                'deadline': quiz.deadline.isoformat() if quiz.deadline else None,
                'max_retakes': quiz.max_retakes,
                'total_questions': total_questions
            },
            'stats': {
                'total_participants': total_participants,
                'average_score': round(avg_score, 2),
                'average_accuracy': round((avg_accuracy / max(total_questions, 1)) * 100, 1),
                'completion_rate': round((all_participants.filter(
                    total_attempted__gte=total_questions
                ).count() / max(total_participants, 1)) * 100, 1),
                'hardest_question': hardest['question_text'] if hardest else None,
                'easiest_question': easiest['question_text'] if easiest else None
            },
            'leaderboard': leaderboard,
            'question_analytics': question_analytics
        })


class LiveQuizQuestionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing quiz questions"""
    queryset = LiveQuizQuestion.objects.all()
    serializer_class = LiveQuizQuestionSerializer
    permission_classes = [IsAuthenticated, IsInstructorOrAdmin]
    
    def get_queryset(self):
        """Filter questions by quiz if provided"""
        queryset = super().get_queryset()
        quiz_id = self.request.query_params.get('quiz_id')
        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)
        return queryset.order_by('order')


class LiveQuizSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing quiz sessions"""
    queryset = LiveQuizSession.objects.all()
    serializer_class = LiveQuizSessionSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'])
    def leaderboard(self, request, pk=None):
        """Get current leaderboard for a session"""
        session = self.get_object()
        participants = session.participants.filter(is_active=True).order_by(
            '-total_score', 'average_response_time'
        )[:10]  # Top 10
        
        leaderboard = []
        for rank, participant in enumerate(participants, 1):
            leaderboard.append({
                'rank': rank,
                'participant_id': str(participant.id),
                'nickname': participant.nickname,
                'total_score': participant.total_score,
                'total_correct': participant.total_correct,
                'total_attempted': participant.total_attempted,
                'average_response_time': round(participant.average_response_time, 2),
                'is_flagged': participant.is_flagged
            })
        
        return Response({'leaderboard': leaderboard})
    
    @action(detail=True, methods=['post'], permission_classes=[IsInstructorOrAdmin])
    def next_question(self, request, pk=None):
        """Advance to the next question"""
        session = self.get_object()
        
        if session.status != 'in_progress':
            return Response(
                {'error': 'Session is not in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get next question
        current_order = session.current_question.order if session.current_question else 0
        next_question = session.quiz.live_questions.filter(
            order__gt=current_order
        ).order_by('order').first()
        
        if not next_question:
            return Response(
                {'error': 'No more questions'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        session.advance_to_question(next_question)
        
        serializer = self.get_serializer(session)
        return Response(serializer.data)


class LiveQuizResponseViewSet(viewsets.ModelViewSet):
    """ViewSet for submitting and viewing quiz responses"""
    queryset = LiveQuizResponse.objects.select_related('participant', 'question').all()
    serializer_class = LiveQuizResponseSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Submit an answer to a question"""
        participant_id = request.data.get('participant_id')
        question_id = request.data.get('question_id')
        answer_text = request.data.get('answer_text', '')
        code_submission = request.data.get('code_submission', '')
        response_time = request.data.get('response_time_seconds', 0)
        
        # Get participant and question with related session preloaded
        participant = get_object_or_404(
            LiveQuizParticipant.objects.select_related('session'),
            id=participant_id, student=request.user
        )
        question = get_object_or_404(LiveQuizQuestion, id=question_id)
        
        # Check if already answered
        if LiveQuizResponse.objects.filter(participant=participant, question=question).exists():
            return Response(
                {'error': 'Question already answered'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Evaluate answer
        is_correct = False
        if question.question_type == 'coding':
            # TODO: Implement code execution and testing
            is_correct = False
        else:
            is_correct = answer_text.strip().upper() == question.correct_answer.strip().upper()
        
        # Calculate points
        points = 0
        if is_correct:
            if question.time_bonus_enabled:
                time_percentage = max(0, (question.time_limit - response_time) / question.time_limit)
                points = int(question.points * 0.5 + question.points * 0.5 * time_percentage)
            else:
                points = question.points
        
        # Create response
        response = LiveQuizResponse.objects.create(
            participant=participant,
            question=question,
            answer_text=answer_text,
            code_submission=code_submission,
            is_correct=is_correct,
            points_earned=points,
            response_time_seconds=response_time
        )
        
        # Update participant stats
        participant.total_attempted += 1
        if is_correct:
            participant.total_correct += 1
            participant.total_score += points
        
        # Update average response time
        total_time = participant.average_response_time * (participant.total_attempted - 1) + response_time
        participant.average_response_time = total_time / participant.total_attempted
        
        # Update rank inline
        higher_scorers = LiveQuizParticipant.objects.filter(
            session=participant.session,
            is_active=True,
            total_score__gt=participant.total_score
        ).count()
        participant.rank = higher_scorers + 1
        participant.save()
        
        return Response({
            'id': str(response.id),
            'is_correct': is_correct,
            'points_earned': points,
            'explanation': question.explanation or '',
            'participant_score': participant.total_score,
            'participant_correct': participant.total_correct,
            'participant_attempted': participant.total_attempted,
            'rank': participant.rank,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def complete_self_paced(self, request):
        """Mark self-paced quiz as completed for a participant"""
        participant_id = request.data.get('participant_id')
        
        participant = get_object_or_404(
            LiveQuizParticipant,
            id=participant_id,
            student=request.user
        )
        
        session = participant.session
        quiz = session.quiz
        
        if quiz.quiz_mode != 'self_paced':
            return Response(
                {'error': 'This endpoint is only for self-paced quizzes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark participant as done
        participant.is_active = False
        participant.left_at = timezone.now()
        participant.save(update_fields=['is_active', 'left_at'])
        
        # Update session counts
        session.active_participants = session.participants.filter(is_active=True).count()
        session.save(update_fields=['active_participants'])
        
        # Generate results for this participant
        total_questions = quiz.live_questions.count()
        responses = LiveQuizResponse.objects.filter(
            participant=participant
        ).select_related('question').order_by('question__order')
        
        question_results = []
        for resp in responses:
            question_results.append({
                'question_text': resp.question.question_text,
                'question_type': resp.question.question_type,
                'answer_given': resp.answer_text or resp.code_submission,
                'is_correct': resp.is_correct,
                'points_earned': resp.points_earned,
                'points_possible': resp.question.points,
                'response_time': round(resp.response_time_seconds, 1),
                'explanation': resp.question.explanation or '',
            })
        
        # Get rank among all participants for this quiz
        all_participants = LiveQuizParticipant.objects.filter(
            session__quiz=quiz
        ).order_by('-total_score', 'average_response_time')
        
        rank = 1
        for p in all_participants:
            if p.id == participant.id:
                break
            rank += 1
        
        return Response({
            'quiz_title': quiz.title,
            'total_score': participant.total_score,
            'total_correct': participant.total_correct,
            'total_attempted': participant.total_attempted,
            'total_questions': total_questions,
            'accuracy': round((participant.total_correct / max(participant.total_attempted, 1)) * 100, 1),
            'average_response_time': round(participant.average_response_time, 2),
            'rank': rank,
            'total_participants': all_participants.count(),
            'question_results': question_results,
        }, status=status.HTTP_200_OK)
