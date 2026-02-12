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
        
        # Check if quiz already has an active session
        if hasattr(quiz, 'session') and quiz.session.status != 'ended':
            return Response(
                {'error': 'Quiz already has an active session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if quiz has questions
        if quiz.live_questions.count() == 0:
            return Response(
                {'error': 'Quiz must have at least one question'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create session
        session = LiveQuizSession.objects.create(
            quiz=quiz,
            status='lobby'
        )
        
        # Mark quiz as active
        quiz.start_session()
        
        serializer = LiveQuizSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
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
        session.save()
        
        quiz.end_session()
        
        # Generate results
        results = self._generate_results(session)
        
        return Response(results, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def join_info(self, request, pk=None):
        """Get quiz info for students joining via code"""
        quiz = self.get_object()
        
        if not quiz.is_active:
            return Response(
                {'error': 'Quiz is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'id': quiz.id,
            'title': quiz.title,
            'description': quiz.description,
            'instructor_name': quiz.instructor.get_full_name(),
            'require_fullscreen': quiz.require_fullscreen,
            'max_participants': quiz.max_participants,
            'questions_count': quiz.live_questions.count()
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
        
        # Check if quiz is active
        if not quiz.is_active:
            return Response(
                {'error': 'Quiz is not active yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if session exists
        if not hasattr(quiz, 'session'):
            return Response(
                {'error': 'Quiz session not started yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session = quiz.session
        
        # Check late join policy
        if session.status != 'lobby' and not quiz.allow_late_join:
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
        session.update_participant_count()
        
        return Response({
            'quiz_id': str(quiz.id),
            'session_id': str(session.id),
            'participant_id': str(participant.id),
            'attempts_message': message,
            'time_limit_minutes': quiz.time_limit_minutes,
            'quiz_info': LiveQuizSerializer(quiz, context={'request': request}).data
        }, status=status.HTTP_200_OK)
    
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
                'student_name': participant.student.get_full_name() if participant.student else 'Anonymous',
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
    queryset = LiveQuizResponse.objects.all()
    serializer_class = LiveQuizResponseSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Submit an answer to a question"""
        participant_id = request.data.get('participant_id')
        question_id = request.data.get('question_id')
        answer_text = request.data.get('answer_text', '')
        code_submission = request.data.get('code_submission', '')
        response_time = request.data.get('response_time_seconds', 0)
        
        # Get participant and question
        participant = get_object_or_404(LiveQuizParticipant, id=participant_id, student=request.user)
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
        participant.save()
        
        # Update rank
        participant.update_rank()
        
        serializer = self.get_serializer(response)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
