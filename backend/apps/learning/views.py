"""
Views for Learning app
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import (
    CareerPath, LearningModule, Quiz, Question, QuestionChoice,
    UserProgress, QuizAttempt, Answer, Certificate, Enrollment,
    ModuleProgress, AchievedSkill, BadgeDefinition, UserBadge, LeaderboardSnapshot
)
from .serializers import (
    CareerPathSerializer, LearningModuleSerializer, QuizSerializer,
    QuestionSerializer, UserProgressSerializer, QuizAttemptSerializer,
    CertificateSerializer, EnrollmentSerializer, ModuleProgressSerializer,
    AchievedSkillSerializer, BadgeDefinitionSerializer, UserBadgeSerializer,
    LeaderboardEntrySerializer
)
from .badge_service import grant_badges_after_module, grant_badges_after_path
from .leaderboard_service import update_leaderboard_score

def annotated_career_paths(base=None):
    """
    CareerPath queryset shaped for CareerPathSerializer.

    The serializer needs a module count, a distinct enrolled-user count and the
    `prerequisites` M2M. Resolved per object those are four queries per row.
    Shared so everywhere the serializer is used — directly, or nested inside
    EnrollmentSerializer — gets the same treatment, not just the obvious
    endpoint.
    """
    qs = CareerPath.objects.all() if base is None else base
    return qs.prefetch_related('prerequisites').annotate(
        # distinct=True is required: joining modules and userprogress together
        # multiplies rows, and without it both counts come out inflated.
        modules_total=Count('modules', distinct=True),
        enrolled_total=Count('userprogress__user', distinct=True),
    ).order_by(
        # Repeating Meta.ordering explicitly is not redundant: annotate() sets
        # a GROUP BY, and QuerySet.ordered reports False whenever a query is
        # grouped, so DRF paginates this as an unordered list and pages can
        # repeat or skip rows.
        'program_type', 'difficulty_level', 'name', 'id',
    )


class CareerPathViewSet(viewsets.ModelViewSet):
    """ViewSet for CareerPath"""
    queryset = annotated_career_paths(CareerPath.objects.filter(is_active=True))
    serializer_class = CareerPathSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'id'  # Changed from 'slug' to 'id' for UUID lookup
    
    def get_queryset(self):
        queryset = super().get_queryset()
        program = self.request.query_params.get('program')
        difficulty = self.request.query_params.get('difficulty')
        featured = self.request.query_params.get('featured')
        
        if program:
            queryset = queryset.filter(program_type=program)
        if difficulty:
            queryset = queryset.filter(difficulty_level=difficulty)
        if featured:
            queryset = queryset.filter(is_featured=True)
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Get single career path with enrollment status"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Add enrollment status if user is authenticated
        if request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(
                user=request.user,
                career_path=instance
            ).first()
            
            if enrollment:
                data['is_enrolled'] = True
                data['enrollment_id'] = str(enrollment.id)
                data['progress_percentage'] = enrollment.progress_percentage
                data['enrollment_status'] = enrollment.status
            else:
                data['is_enrolled'] = False
        
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def enroll(self, request, slug=None):
        """Enroll user in a career path"""
        career_path = self.get_object()
        user = request.user
        
        # Check if already enrolled
        if UserProgress.objects.filter(user=user, career_path=career_path).exists():
            return Response(
                {'detail': 'Already enrolled in this career path'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create initial progress entry
        UserProgress.objects.create(
            user=user,
            career_path=career_path,
            completion_percentage=0
        )
        
        return Response(
            {'detail': 'Successfully enrolled in career path'},
            status=status.HTTP_201_CREATED
        )


def annotated_modules(base=None):
    """
    LearningModule queryset shaped for LearningModuleSerializer.

    The serializer reads career_path.name, a quiz count, and the
    `prerequisites` M2M. Unshaped that is three queries per row.

    Shared with AdminLearningModuleViewSet: the two are separate classes over
    the same model, and optimising only this one is exactly why the admin
    Learning page stayed at 63 queries after the public endpoint dropped to 4.
    """
    qs = LearningModule.objects.all() if base is None else base
    return qs.select_related('career_path').prefetch_related('prerequisites').annotate(
        quiz_total=Count('quizzes', distinct=True),
    )


class LearningModuleViewSet(viewsets.ModelViewSet):
    """ViewSet for LearningModule"""
    queryset = annotated_modules()
    serializer_class = LearningModuleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        career_path = self.request.query_params.get('career_path')
        module_type = self.request.query_params.get('type')
        
        if career_path:
            queryset = queryset.filter(career_path__slug=career_path)
        if module_type:
            queryset = queryset.filter(module_type=module_type)
        
        return queryset.order_by('order')
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark module as completed"""
        module = self.get_object()
        user = request.user
        
        # Auto-create enrollment if not exists
        enrollment = self._ensure_enrollment(user, module.career_path)
        
        # Update UserProgress
        progress, created = UserProgress.objects.get_or_create(
            user=user,
            career_path=module.career_path,
            learning_module=module
        )

        # Initialise before the guard so re-completing an already-finished module
        # returns success instead of raising UnboundLocalError. The guard below
        # still prevents duplicate points/badge awards. (Remediation Req 6.)
        newly_earned_badges = []

        if not progress.is_completed:
            progress.is_completed = True
            progress.completion_percentage = 100
            progress.completed_at = timezone.now()
            progress.save()
            
            # Synchronize with ModuleProgress
            try:
                module_progress, mp_created = ModuleProgress.objects.get_or_create(
                    user=user,
                    module=module,
                    enrollment=enrollment,
                    defaults={'status': 'in_progress'}
                )
                
                if module_progress.status != 'completed':
                    module_progress.status = 'completed'
                    module_progress.completed_at = timezone.now()
                    module_progress.save()
                
                # Update enrollment progress percentage
                total_modules = enrollment.career_path.modules.count()
                completed_modules = ModuleProgress.objects.filter(
                    enrollment=enrollment,
                    status='completed'
                ).count()
                
                if total_modules > 0:
                    enrollment.progress_percentage = int((completed_modules / total_modules) * 100)
                    enrollment.save()
            except Exception as e:
                print(f"Error updating module progress: {e}")
            
            # Update user profile stats
            try:
                profile = user.profile
                profile.total_modules_completed = UserProgress.objects.filter(
                    user=user, is_completed=True
                ).count()
                profile.save(update_fields=['total_modules_completed'])
            except Exception as e:
                print(f"Could not update profile module count: {e}")

            # Grant skills from this module
            self._grant_skills_from_module(user, module)

            # Grant badges after module completion
            newly_earned_badges = []
            try:
                newly_earned_badges = grant_badges_after_module(user)
            except Exception as e:
                print(f"Badge granting failed (non-fatal): {e}")

            # Update leaderboard score
            try:
                update_leaderboard_score(user)
            except Exception as e:
                print(f"Leaderboard update failed (non-fatal): {e}")

            # Check if all modules completed and award certificate
            path_badges = self.check_and_award_certificate(user, module.career_path)
            newly_earned_badges += (path_badges or [])
        
        return Response({
            'detail': 'Module marked as completed',
            'points_earned': module.points_reward,
            'is_completed': True,
            'badges_earned': newly_earned_badges,
        })
    
    @action(detail=True, methods=['post'])
    def save_progress(self, request, pk=None):
        """Save current slide progress"""
        module = self.get_object()
        current_slide = request.data.get('current_slide', 0)
        total_slides = request.data.get('total_slides', 1)
        
        # Calculate progress percentage based on slides
        progress_percentage = int((current_slide + 1) / total_slides * 100) if total_slides > 0 else 0
        
        # Auto-create enrollment if not exists
        self._ensure_enrollment(request.user, module.career_path)
        
        # Create or update progress
        progress, created = UserProgress.objects.update_or_create(
            user=request.user,
            career_path=module.career_path,
            learning_module=module,
            defaults={
                'current_slide': current_slide,
                'total_slides': total_slides,
                'completion_percentage': progress_percentage
            }
        )
        
        # NOTE: Certificate check removed from here
        # It should only run when module is explicitly completed, not on every slide save
        
        return Response({
            'message': 'Progress saved',
            'current_slide': current_slide,
            'total_slides': total_slides,
            'progress_percentage': progress_percentage
        })
    
    def _grant_skills_from_module(self, user, module):
        """Grant AchievedSkill records from module.skills_taught on completion."""
        skills = module.skills_taught or []
        for skill in skills:
            skill_name = skill.get('name', '').strip()
            if not skill_name:
                continue
            AchievedSkill.objects.get_or_create(
                user=user,
                skill_name=skill_name,
                source_type='module',
                source_id=str(module.id),
                defaults={
                    'source_name': module.title,
                    'skill_category': skill.get('category', 'General'),
                    'proficiency_level': skill.get('level', 'beginner'),
                }
            )

    def _grant_skills_from_path(self, user, career_path):
        """Grant AchievedSkill records from career_path.skills_granted on path completion."""
        skills = career_path.skills_granted or []
        for skill in skills:
            skill_name = skill.get('name', '').strip()
            if not skill_name:
                continue
            AchievedSkill.objects.get_or_create(
                user=user,
                skill_name=skill_name,
                source_type='path',
                source_id=str(career_path.id),
                defaults={
                    'source_name': career_path.name,
                    'skill_category': skill.get('category', 'General'),
                    'proficiency_level': skill.get('level', 'intermediate'),
                }
            )

    def _ensure_enrollment(self, user, career_path):
        """Ensure user has an enrollment for this career path"""
        enrollment, created = Enrollment.objects.get_or_create(
            user=user,
            career_path=career_path,
            defaults={'status': 'active', 'progress_percentage': 0}
        )
        if created:
            print(f"Auto-created enrollment for {user.username} in {career_path.name}")
        return enrollment
    
    def check_and_award_certificate(self, user, career_path):
        """Check if user completed all modules and award certificate. Returns badge names."""
        path_badges = []
        try:
            from .models import Certificate, Enrollment
            from django.db import transaction
            
            # Get all modules in this path
            total_modules = LearningModule.objects.filter(career_path=career_path).count()
            
            if total_modules == 0:
                return path_badges  # No modules, nothing to complete
            
            # Get completed modules by user
            completed_modules = UserProgress.objects.filter(
                user=user,
                career_path=career_path,
                is_completed=True
            ).count()
            
            print(f"Certificate check: {completed_modules}/{total_modules} modules completed")
            
            # If all modules completed
            if completed_modules >= total_modules:
                with transaction.atomic():
                    # Get or create enrollment and mark as completed
                    enrollment = self._ensure_enrollment(user, career_path)
                    
                    if enrollment.status != 'completed':
                        enrollment.status = 'completed'
                        enrollment.progress_percentage = 100
                        enrollment.completed_at = timezone.now()
                        enrollment.save()
                        print(f"Enrollment marked as completed for user {user.username}")
                    
                    # Award certificate if doesn't exist
                    cert, created = Certificate.objects.get_or_create(
                        user=user,
                        career_path=career_path,
                        defaults={
                            'certificate_id': f'CERT-{user.id}-{str(career_path.id)[:8]}',
                            'issued_at': timezone.now(),
                            'enrollment': enrollment
                        }
                    )
                    
                    if created:
                        print(f"Certificate awarded to {user.username} for {career_path.name}")
                        
                        # Update user profile certificate count
                        try:
                            profile = user.profile
                            profile.certificates_earned = Certificate.objects.filter(user=user).count()
                            profile.save(update_fields=['certificates_earned'])
                        except Exception as e:
                            print(f"Could not update profile certificate count: {e}")
                        
                        # Grant path-completion badges
                        try:
                            path_badges = grant_badges_after_path(user)
                        except Exception as e:
                            print(f"Path badge granting failed (non-fatal): {e}")
                        
                        # Grant skills from path
                        self._grant_skills_from_path(user, career_path)
                        
                        # Generate PDF certificate (async-safe)
                        self._generate_certificate_pdf(cert, career_path)
                        
        except Exception as e:
            # Don't fail the request if certificate awarding fails
            print(f"Error awarding certificate: {e}")
        return path_badges
    
    def _generate_certificate_pdf(self, certificate, career_path):
        """Generate PDF certificate image"""
        try:
            from .utils.certificate_generator import generate_certificate_pdf
            pdf_path = generate_certificate_pdf(
                certificate=certificate,
                career_path=career_path
            )
            if pdf_path:
                certificate.pdf_url = pdf_path
                certificate.save(update_fields=['pdf_url'])
                print(f"Certificate PDF generated: {pdf_path}")
        except ImportError:
            print("Certificate generator not available - skipping PDF generation")
        except Exception as e:
            print(f"Error generating certificate PDF: {e}")
    
    @action(detail=True, methods=['get'])
    def get_progress(self, request, pk=None):
        """Get saved progress for this module"""
        module = self.get_object()
        
        try:
            progress = UserProgress.objects.get(
                user=request.user,
                career_path=module.career_path,
                learning_module=module
            )
            return Response({
                'current_slide': progress.current_slide,
                'total_slides': progress.total_slides,
                'completion_percentage': progress.completion_percentage,
                'is_completed': progress.is_completed,
                'last_accessed_at': progress.last_accessed_at
            })
        except UserProgress.DoesNotExist:
            return Response({
                'current_slide': 0,
                'total_slides': 1,
                'completion_percentage': 0,
                'is_completed': False
            })


class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for Quiz"""
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['learning_module']
    
    def get_queryset(self):
        """Filter quizzes by learning_module if provided"""
        # QuizSerializer nests the questions (with their choices) and reads
        # learning_module — two queries per quiz otherwise.
        queryset = Quiz.objects.select_related('learning_module').prefetch_related(
            'questions__choices',
        )
        learning_module = self.request.query_params.get('learning_module', None)
        if learning_module:
            queryset = queryset.filter(learning_module_id=learning_module)
        # Quiz has no Meta.ordering, and paginating an unordered queryset gives
        # the database licence to return rows in any order per query — so page
        # 2 can repeat or skip rows from page 1.
        return queryset.order_by('-created_at', 'id')
    
    def get_permissions(self):
        """Allow read-only access for unauthenticated users on list/retrieve"""
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticatedOrReadOnly()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a quiz attempt"""
        quiz = self.get_object()
        user = request.user
        
        # Check max attempts
        attempts_count = QuizAttempt.objects.filter(
            user=user,
            quiz=quiz,
            status='completed'
        ).count()
        
        if attempts_count >= quiz.max_attempts:
            return Response(
                {'detail': 'Maximum attempts reached'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Resume an existing in-progress attempt instead of creating a second
        # one — otherwise submit() can find multiple in-progress attempts and
        # raise MultipleObjectsReturned. (Remediation Req 11.)
        existing = QuizAttempt.objects.filter(
            user=user, quiz=quiz, status='in_progress'
        ).order_by('-started_at').first()
        if existing:
            serializer = QuizAttemptSerializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Create new attempt
        attempt = QuizAttempt.objects.create(
            user=user,
            quiz=quiz,
            status='in_progress'
        )

        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit quiz answers"""
        quiz = self.get_object()
        user = request.user
        answers_data = request.data.get('answers', [])

        # Get active attempt. Use filter().first() rather than get() so that any
        # pre-existing duplicate in-progress attempts (from before the start()
        # de-duplication) resolve to exactly one and never raise
        # MultipleObjectsReturned. (Remediation Req 11.)
        attempt = QuizAttempt.objects.select_related('quiz').filter(
            user=user,
            quiz=quiz,
            status='in_progress'
        ).order_by('started_at').first()
        if attempt is None:
            return Response(
                {'detail': 'No active quiz attempt found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── SERVER-SIDE TIMER ENFORCEMENT ────────────────────────────────────
        # Reject submissions that arrive after the time limit has expired.
        # started_at is set automatically (auto_now_add) when the attempt is created.
        if quiz.time_limit_minutes and quiz.time_limit_minutes > 0:
            elapsed_seconds = (timezone.now() - attempt.started_at).total_seconds()
            allowed_seconds = quiz.time_limit_minutes * 60 + 30  # +30s grace for network delay
            if elapsed_seconds > allowed_seconds:
                attempt.status = 'timed_out'
                attempt.submitted_at = timezone.now()
                attempt.save(update_fields=['status', 'submitted_at'])
                return Response(
                    {'detail': 'Time limit exceeded. Your attempt has been marked as timed out.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Process answers
        total_points = 0
        earned_points = 0

        # Key by str(id): in_bulk() returns UUID-typed keys, so looking up by the
        # string question_id from the JSON body would always miss and silently
        # score every answer 0. (Latent scoring bug surfaced fixing Req 7.)
        submitted_ids = [a.get('question_id') for a in answers_data if a.get('question_id')]
        questions_by_id = {
            str(q.id): q
            for q in Question.objects.filter(quiz=quiz, id__in=submitted_ids)
        }

        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            user_answer = answer_data.get('answer')
            question = questions_by_id.get(str(question_id))
            if not question:
                continue

            total_points += question.points
            is_correct = self._check_answer(question, user_answer)
            points = question.points if is_correct else 0
            earned_points += points

            Answer.objects.create(
                quiz_attempt=attempt,
                question=question,
                answer_data=user_answer,
                is_correct=is_correct,
                points_earned=points
            )

        # Calculate score
        score = (earned_points / total_points * 100) if total_points > 0 else 0
        attempt.score = score
        attempt.status = 'completed'
        attempt.submitted_at = timezone.now()
        attempt.save()

        # Count completed attempts to determine if this is the final one
        completed_attempts = QuizAttempt.objects.filter(
            user=user, quiz=quiz, status='completed'
        ).count()
        is_final_attempt = (completed_attempts >= quiz.max_attempts)

        response_data = {
            'score': score,
            'passed': score >= quiz.passing_score,
            'earned_points': earned_points,
            'total_points': total_points,
            'attempts_used': completed_attempts,
            'attempts_remaining': max(0, quiz.max_attempts - completed_attempts),
        }

        # Only show per-question breakdown if:
        # 1. Instructor has opted in AND
        # 2. Student is on their final attempt (prevents answer inference via retakes)
        if quiz.show_results_to_students and is_final_attempt:
            answers_detail = []
            for answer_data in answers_data:
                question_id = answer_data.get('question_id')
                question = questions_by_id.get(str(question_id))
                if question:
                    user_answer = answer_data.get('answer')
                    is_correct = self._check_answer(question, user_answer)
                    answers_detail.append({
                        'question_id': str(question.id),
                        'question_text': question.question_text,
                        'is_correct': is_correct,
                    })
            response_data['answers_detail'] = answers_detail

        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def submit_simple(self, request, pk=None):
        """Submit slide-based quiz results (simplified for slide-based quizzes)"""
        quiz = self.get_object()
        user = request.user
        score = request.data.get('score', 0)
        points_earned = request.data.get('points_earned', 0)
        total_points = request.data.get('total_points', 0)
        time_taken = request.data.get('time_taken_seconds', 0)
        
        # Check max attempts
        attempts_count = QuizAttempt.objects.filter(
            user=user,
            quiz=quiz,
            status='completed'
        ).count()
        
        if attempts_count >= quiz.max_attempts:
            return Response(
                {'detail': f'Maximum attempts ({quiz.max_attempts}) reached'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create quiz attempt
        attempt = QuizAttempt.objects.create(
            user=user,
            quiz=quiz,
            score=score,
            time_taken_seconds=time_taken,
            status='completed',
            submitted_at=timezone.now()
        )
        
        passed = score >= quiz.passing_score
        
        return Response({
            'attempt_id': str(attempt.id),
            'score': score,
            'passed': passed,
            'points_earned': points_earned,
            'total_points': total_points,
            'attempts_used': attempts_count + 1,
            'attempts_remaining': quiz.max_attempts - (attempts_count + 1)
        }, status=status.HTTP_201_CREATED)
    
    def _check_answer(self, question, user_answer):
        """Check if answer is correct"""
        if question.question_type == 'multiple_choice':
            return str(user_answer) == str(question.correct_answer)
        elif question.question_type == 'true_false':
            return str(user_answer).lower() == str(question.correct_answer).lower()
        elif question.question_type == 'short_answer':
            return str(user_answer).strip().lower() == str(question.correct_answer).strip().lower()
        return False
    
    @action(detail=False, methods=['post'])
    def extract_questions(self, request):
        """
        Extract quiz questions from uploaded PDF/DOCX using AI
        
        POST /api/learning/quizzes/extract_questions/
        Body: multipart/form-data with 'file'
        Returns: Array of questions in QuizEditor format
        """
        from .pdf_extractor import process_pdf_for_learning
        
        uploaded_file = request.FILES.get('file')
        
        if not uploaded_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        filename = uploaded_file.name.lower()
        if not (filename.endswith('.pdf') or filename.endswith('.docx') or filename.endswith('.doc')):
            return Response(
                {'error': 'File must be a PDF or Word document'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024
        if uploaded_file.size > max_size:
            return Response(
                {'error': 'File too large. Maximum size is 10MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get user's preferred AI model
            from apps.ai_mentor.models import AIMentorProfile
            profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
            model_type = profile.preferred_ai_model
            
            if not model_type:
                return Response(
                    {'error': 'Please select an AI model in AI Settings before using AI features.', 'model_required': True},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract questions using AI with user's selected model
            extracted_content = process_pdf_for_learning(uploaded_file, 'quiz_only', model_type=model_type)
            
            questions = extracted_content.get('questions', [])
            
            # Ensure IDs are unique string values
            for i, q in enumerate(questions):
                if not q.get('id'):
                    q['id'] = str(i + 1)
                # Ensure type is valid
                if q.get('type') not in ['multiple_choice', 'true_false', 'short_answer', 'essay', 'enumeration']:
                    q['type'] = 'multiple_choice'
                # Ensure points is a number
                if not isinstance(q.get('points'), int):
                    q['points'] = 1
            
            return Response({
                'success': True,
                'message': f'Extracted {len(questions)} questions',
                'questions': questions
            })
            
        except ImportError as e:
            return Response(
                {'error': f'PDF library not installed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to extract questions: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProgressViewSet(viewsets.ModelViewSet):
    """ViewSet for UserProgress"""
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # UserProgressSerializer nests the whole CareerPathSerializer, so each
        # row re-ran that serializer's module/enrolled counts and prerequisites
        # M+1 times. Prefetch through the shared annotated queryset so the
        # nested representation is built from one extra query, not four per row.
        queryset = UserProgress.objects.filter(
            user=self.request.user
        ).select_related('user').prefetch_related(
            # Prefetch, not select_related, for both: the nested serializers
            # need the annotations and prefetched M2Ms that select_related
            # cannot carry, so a plain join still left three queries per row.
            Prefetch('career_path', queryset=annotated_career_paths()),
            Prefetch('learning_module', queryset=annotated_modules()),
        )

        # Filter by career_path if provided
        career_path = self.request.query_params.get('career_path')
        if career_path:
            queryset = queryset.filter(career_path__id=career_path)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Certificate"""
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Certificate has no Meta.ordering; paginating unordered lets the
        # database return rows in any order, so pages can repeat or skip.
        return Certificate.objects.filter(
            user=self.request.user
        ).select_related('career_path', 'user', 'enrollment').order_by('-issued_at', 'id')
    
    @action(detail=False, methods=['get'])
    def eligibility(self, request):
        """
        Return per-career-path eligibility for the current user.
        Lets the frontend show exactly why a certificate hasn't been issued yet.
        """
        user = request.user
        paths = CareerPath.objects.filter(is_active=True).prefetch_related('modules')

        # Two queries for the whole response instead of two per career path
        # (a COUNT and an EXISTS each), which is what made this ~17 round-trips
        # to return 1 KB.
        completed_by_path = dict(
            UserProgress.objects.filter(user=user, is_completed=True)
            .values_list('career_path_id').annotate(n=Count('id'))
        )
        certified_paths = set(
            Certificate.objects.filter(user=user).values_list('career_path_id', flat=True)
        )

        result = []
        for path in paths:
            total = len(path.modules.all())   # already prefetched above
            if total == 0:
                continue
            completed = completed_by_path.get(path.id, 0)
            has_cert = path.id in certified_paths
            result.append({
                'path_id': str(path.id),
                'path_name': path.name,
                'total_modules': total,
                'completed_modules': completed,
                'progress_pct': round(completed / total * 100),
                'is_eligible': completed >= total,
                'has_certificate': has_cert,
            })
        return Response(result)
    
    @action(detail=False, methods=['post'])
    def check_and_award(self, request):
        """
        Manually trigger certificate check for a specific career path.
        POST body: { "career_path_id": "<uuid>" }
        Useful for awarding certificates retroactively if the trigger missed.
        """
        path_id = request.data.get('career_path_id')
        if not path_id:
            return Response({'error': 'career_path_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        career_path = get_object_or_404(CareerPath, id=path_id, is_active=True)
        total = career_path.modules.count()
        if total == 0:
            return Response({'error': 'No modules in this path'}, status=status.HTTP_400_BAD_REQUEST)
        
        completed = UserProgress.objects.filter(
            user=request.user, career_path=career_path, is_completed=True
        ).count()
        
        if completed < total:
            return Response({
                'eligible': False,
                'message': f'Complete all modules first ({completed}/{total} done)',
                'completed': completed,
                'total': total,
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # All modules done — award certificate
        enrollment, _ = Enrollment.objects.get_or_create(
            user=request.user, career_path=career_path,
            defaults={'status': 'active'}
        )
        enrollment.status = 'completed'
        enrollment.progress_percentage = 100
        enrollment.completed_at = timezone.now()
        enrollment.save()
        
        cert_id = f'CCIS-{timezone.now().year}-{str(request.user.id)[:6].upper()}-{str(career_path.id)[:6].upper()}'
        cert, created = Certificate.objects.get_or_create(
            user=request.user,
            career_path=career_path,
            defaults={'certificate_id': cert_id, 'enrollment': enrollment}
        )
        
        if created:
            # Update profile cert count
            try:
                profile = request.user.profile
                profile.certificates_earned = Certificate.objects.filter(user=request.user).count()
                profile.save(update_fields=['certificates_earned'])
            except Exception:
                pass
        
        serializer = self.get_serializer(cert)
        return Response({
            'created': created,
            'message': 'Certificate awarded!' if created else 'Certificate already exists',
            'certificate': serializer.data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download certificate image as attachment"""
        import os
        from django.http import FileResponse, Http404
        from django.conf import settings
        
        certificate = self.get_object()
        
        if not certificate.pdf_url:
            return Response(
                {'error': 'Certificate image not yet generated. Please claim it first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Resolve the file path from the relative URL
        # pdf_url is stored as '/media/certificates/issued/filename.png'
        relative_path = certificate.pdf_url.lstrip('/')
        if relative_path.startswith('media/'):
            relative_path = relative_path[6:]  # Remove 'media/' prefix
        
        file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        
        if not os.path.exists(file_path):
            # Try to regenerate
            try:
                from .utils.certificate_generator import generate_certificate_pdf
                new_path = generate_certificate_pdf(
                    certificate=certificate,
                    career_path=certificate.career_path
                )
                if new_path:
                    certificate.pdf_url = new_path
                    certificate.save(update_fields=['pdf_url'])
                    relative_path = new_path.lstrip('/')
                    if relative_path.startswith('media/'):
                        relative_path = relative_path[6:]
                    file_path = os.path.join(settings.MEDIA_ROOT, relative_path)
                else:
                    raise Http404("Certificate file could not be generated")
            except Exception as e:
                return Response(
                    {'error': f'Certificate file not found and regeneration failed: {str(e)}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Serve the file as a downloadable attachment
        filename = f"Certificate_{certificate.career_path.name.replace(' ', '_')}_{certificate.certificate_id}.png"
        response = FileResponse(
            open(file_path, 'rb'),
            content_type='image/png'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    
    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        """Claim/regenerate a certificate image"""
        certificate = self.get_object()
        
        try:
            from .utils.certificate_generator import generate_certificate_pdf
            pdf_path = generate_certificate_pdf(
                certificate=certificate,
                career_path=certificate.career_path
            )
            
            if pdf_path:
                certificate.pdf_url = pdf_path
                certificate.save(update_fields=['pdf_url'])
                
                serializer = self.get_serializer(certificate)
                return Response({
                    'message': 'Certificate generated successfully!',
                    'certificate': serializer.data
                })
            else:
                return Response(
                    {'error': 'Failed to generate certificate image'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except ImportError:
            return Response(
                {'error': 'Certificate generator not available. Please install Pillow.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to generate certificate: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Enrollment"""
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # EnrollmentSerializer nests the full CareerPathSerializer and exposes
        # user.username, so an un-shaped queryset cost ~5 queries per row.
        # Prefetch (not select_related) for career_path because the nested
        # serializer needs the annotations, which select_related cannot carry.
        return Enrollment.objects.filter(user=self.request.user).select_related(
            'user'
        ).prefetch_related(
            Prefetch('career_path', queryset=annotated_career_paths())
        )
    
    def create(self, request, *args, **kwargs):
        """Enroll user in a career path"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        career_path = serializer.validated_data.get('career_path')
        
        # Check if already enrolled
        existing = Enrollment.objects.filter(
            user=request.user,
            career_path=career_path
        ).first()
        
        if existing:
            # Return existing enrollment instead of error
            return Response(
                {
                    'message': 'Already enrolled in this career path',
                    'enrollment': EnrollmentSerializer(existing).data
                },
                status=status.HTTP_200_OK
            )
        
        # Create new enrollment
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'message': 'Successfully enrolled in career path',
                'enrollment': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def perform_create(self, serializer):
        """Save enrollment with user"""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def unenroll(self, request, pk=None):
        """Unenroll from a career path"""
        enrollment = self.get_object()
        enrollment.status = 'dropped'
        enrollment.save()
        return Response({'message': 'Successfully unenrolled'})
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get progress for an enrollment"""
        enrollment = self.get_object()
        module_progress = ModuleProgress.objects.filter(enrollment=enrollment)
        serializer = ModuleProgressSerializer(module_progress, many=True)
        return Response(serializer.data)


class ModuleProgressViewSet(viewsets.ModelViewSet):
    """ViewSet for ModuleProgress"""
    serializer_class = ModuleProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # ModuleProgressSerializer nests LearningModuleSerializer, which needs
        # career_path, a quiz count and prerequisites — annotated_modules()
        # supplies all three in one query instead of three per row.
        return ModuleProgress.objects.filter(
            user=self.request.user
        ).select_related('user').prefetch_related(
            Prefetch('module', queryset=annotated_modules()),
        )
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Mark module as started"""
        progress = self.get_object()
        if progress.status == 'not_started':
            progress.status = 'in_progress'
            progress.started_at = timezone.now()
            progress.save()
        return Response(ModuleProgressSerializer(progress).data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark module as completed"""
        progress = self.get_object()
        if progress.status != 'completed':
            progress.status = 'completed'
            progress.completed_at = timezone.now()
            progress.save()
            
            # Update enrollment progress
            enrollment = progress.enrollment
            total_modules = enrollment.career_path.modules.count()
            completed_modules = ModuleProgress.objects.filter(
                enrollment=enrollment,
                status='completed'
            ).count()
            
            if total_modules > 0:
                enrollment.progress_percentage = int((completed_modules / total_modules) * 100)
                enrollment.save()
                
                # Check if all modules completed
                if completed_modules == total_modules:
                    enrollment.status = 'completed'
                    enrollment.completed_at = timezone.now()
                    enrollment.save()
        
        return Response(ModuleProgressSerializer(progress).data)


class PDFExtractorView(viewsets.ViewSet):
    """ViewSet for PDF extraction and learning content generation"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def extract(self, request):
        """
        Extract learning content from uploaded PDF
        
        POST /api/learning/pdf-extractor/extract/
        Body: multipart/form-data with 'pdf_file' and optional 'extraction_type'
        """
        from .pdf_extractor import process_pdf_for_learning
        
        pdf_file = request.FILES.get('pdf_file')
        extraction_type = request.data.get('extraction_type', 'full')
        model_type = request.data.get('model_type')  # Allow specifying AI model
        
        if not pdf_file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type - allow PDF, DOCX, DOC
        allowed_extensions = ('.pdf', '.docx', '.doc')
        file_name = pdf_file.name.lower()
        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            return Response(
                {'error': 'File must be a PDF or Word document (PDF, DOCX, DOC)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024
        if pdf_file.size > max_size:
            return Response(
                {'error': 'File too large. Maximum size is 10MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get AI model - from request or user's profile preference
        model_type = request.data.get('model_type')
        
        import logging
        debug_logger = logging.getLogger('ai_debug')
        debug_logger.setLevel(logging.INFO)
        
        debug_logger.info(f"PDFExtractorView: model_type from request: {model_type}")
        
        if not model_type:
            # Fall back to user's preferred model
            from apps.ai_mentor.models import AIMentorProfile
            profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
            model_type = profile.preferred_ai_model
            debug_logger.info(f"PDFExtractorView: model_type from profile: {model_type}")
            debug_logger.info(f"PDFExtractorView: user: {request.user.username}, profile.id: {profile.id}")
        
        if not model_type:
            debug_logger.warning("PDFExtractorView: NO model_type found!")
            return Response(
                {'error': 'Please select an AI model in AI Settings before using AI features.', 'model_required': True},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        debug_logger.info(f"PDFExtractorView: Using model_type: {model_type}")
        
        try:
            extracted_content = process_pdf_for_learning(pdf_file, extraction_type, model_type)
            return Response({
                'success': True,
                'message': 'Content extracted successfully',
                'data': extracted_content
            })
        except ImportError as e:
            return Response(
                {'error': f'PDF library not installed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to process PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def create_from_extraction(self, request):
        """
        Create path, modules, and quizzes from extracted content
        
        POST /api/learning/pdf-extractor/create_from_extraction/
        Body: JSON with extracted content structure
        """
        data = request.data
        
        if not data:
            return Response(
                {'error': 'No data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            created_items = {
                'path': None,
                'modules': [],
                'quizzes': []
            }
            
            # Create Career Path
            if 'path' in data:
                path_data = data['path']
                from django.utils.text import slugify
                
                path = CareerPath.objects.create(
                    name=path_data.get('name', 'Untitled Course'),
                    slug=slugify(path_data.get('name', 'untitled-course')),
                    description=path_data.get('description', ''),
                    program_type=path_data.get('program_type', 'bsit'),
                    difficulty_level=path_data.get('difficulty_level', 'beginner'),
                    estimated_duration=path_data.get('estimated_duration', 4),
                    required_skills=path_data.get('required_skills', []),
                    is_active=True
                )
                created_items['path'] = CareerPathSerializer(path).data
            
            # Create Modules
            if 'modules' in data and created_items['path']:
                path_id = created_items['path']['id']
                path_obj = CareerPath.objects.get(id=path_id)
                
                for module_data in data['modules']:
                    module = LearningModule.objects.create(
                        career_path=path_obj,
                        title=module_data.get('title', 'Untitled Module'),
                        description=module_data.get('description', ''),
                        content=module_data.get('content', ''),
                        module_type=module_data.get('module_type', 'text'),
                        difficulty_level=module_data.get('difficulty_level', 'beginner'),
                        duration_minutes=module_data.get('duration_minutes', 30),
                        order=module_data.get('order', 1),
                        points_reward=module_data.get('points_reward', 10)
                    )
                    created_items['modules'].append(LearningModuleSerializer(module).data)
                
                # Update path total_modules
                path_obj.total_modules = len(created_items['modules'])
                path_obj.save()
            
            # Create Quizzes
            if 'quizzes' in data and created_items['modules']:
                for quiz_data in data['quizzes']:
                    module_index = quiz_data.get('module_index', 0)
                    
                    if module_index < len(created_items['modules']):
                        module_id = created_items['modules'][module_index]['id']
                        module_obj = LearningModule.objects.get(id=module_id)
                        
                        quiz = Quiz.objects.create(
                            learning_module=module_obj,
                            title=quiz_data.get('title', f"Quiz for {module_obj.title}"),
                            description=quiz_data.get('description', ''),
                            time_limit_minutes=quiz_data.get('time_limit_minutes', 15),
                            passing_score=quiz_data.get('passing_score', 70),
                            max_attempts=quiz_data.get('max_attempts', 3)
                        )
                        
                        # Create Questions
                        questions_data = quiz_data.get('questions', [])
                        for q_index, q_data in enumerate(questions_data):
                            question = Question.objects.create(
                                quiz=quiz,
                                question_text=q_data.get('question_text', ''),
                                question_type=q_data.get('question_type', 'multiple_choice'),
                                correct_answer=q_data.get('correct_answer', ''),
                                points=q_data.get('points', 1),
                                order=q_index + 1,
                                explanation=q_data.get('explanation', '')
                            )
                            
                            # Create Choices for multiple choice
                            if q_data.get('question_type') == 'multiple_choice':
                                choices = q_data.get('choices', [])
                                correct_answer = q_data.get('correct_answer', '')
                                
                                for c_index, choice_text in enumerate(choices):
                                    QuestionChoice.objects.create(
                                        question=question,
                                        choice_text=choice_text,
                                        is_correct=(choice_text == correct_answer or str(c_index) == str(correct_answer)),
                                        order=c_index + 1
                                    )
                        
                        created_items['quizzes'].append(QuizSerializer(quiz).data)
            
            return Response({
                'success': True,
                'message': 'Learning content created successfully',
                'data': created_items
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create content: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate_from_prompt(self, request):
        """
        Generate learning content from a text prompt using AI
        
        POST /api/learning/pdf-extractor/generate_from_prompt/
        Body: JSON with 'prompt', 'module_count', 'include_quizzes'
        """
        from apps.ai_mentor.services.ai_service import get_ai_response
        from apps.ai_mentor.models import AIMentorProfile
        import json
        import re
        
        prompt_text = request.data.get('prompt', '')
        module_count = request.data.get('module_count', 5)
        include_quizzes = request.data.get('include_quizzes', True)
        
        if not prompt_text or not prompt_text.strip():
            return Response(
                {'error': 'Please provide a course description prompt'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's preferred AI model
        model_type = None
        try:
            profile, _ = AIMentorProfile.objects.get_or_create(user=request.user)
            model_type = profile.preferred_ai_model
        except Exception:
            pass
        
        if not model_type:
            model_type = 'openrouter_gemini'
        
        # Build AI prompt for structured content generation
        quiz_instruction = ""
        if include_quizzes:
            quiz_instruction = f"""
Also generate quizzes for each module with 3-5 multiple choice questions each.
The "quizzes" array should contain one quiz per module with this structure:
{{
    "module_index": 0,
    "title": "Quiz for Module 1",
    "description": "Test your knowledge",
    "questions": [
        {{
            "question_text": "What is...",
            "question_type": "multiple_choice",
            "choices": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Option A",
            "explanation": "The correct answer is A because...",
            "points": 10
        }}
    ]
}}"""
        else:
            quiz_instruction = 'Set "quizzes" to an empty array [].'
        
        ai_prompt = f"""Based on this request: "{prompt_text}"

Generate a complete learning path with exactly {module_count} modules.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just JSON):
{{
    "path": {{
        "name": "Course Title",
        "description": "2-3 sentence course description",
        "program_type": "bsit",
        "difficulty_level": "beginner",
        "estimated_duration": 8,
        "required_skills": ["skill1", "skill2"]
    }},
    "modules": [
        {{
            "title": "Module 1: Topic Name",
            "description": "What this module covers",
            "content": "<h2>Introduction</h2><p>This section introduces the topic. Explain the importance and context in 2-3 paragraphs with real detail...</p><h2>Core Concepts</h2><p>Explain the main concepts in depth.</p><ul><li><strong>Concept 1</strong> - Detailed explanation with examples</li><li><strong>Concept 2</strong> - Another detailed explanation</li><li><strong>Concept 3</strong> - More detail here</li></ul><h2>Practical Examples</h2><p>Walk through real examples step by step.</p><pre><code>// Example code here if applicable</code></pre><p>Explain what the code does and why it works this way.</p><h2>Best Practices and Summary</h2><p>Summarize key takeaways and common mistakes to avoid.</p><ol><li>First best practice with explanation</li><li>Second best practice with explanation</li><li>Third best practice with explanation</li></ol>",
            "module_type": "text",
            "difficulty_level": "beginner",
            "duration_minutes": 30,
            "order": 1
        }}
    ],
    "quizzes": []
}}

CRITICAL CONTENT REQUIREMENTS:
- Generate exactly {module_count} modules
- Each module content MUST have AT LEAST 4 different <h2> sections (e.g. Introduction, Core Concepts, Examples, Summary)
- Each <h2> section must contain 2-4 paragraphs of REAL, DETAILED educational content (not placeholders)
- Total content per module: 800-1500 words minimum
- Use rich HTML: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <code>, <pre>, <blockquote>
- Include code examples with <pre><code> where relevant to the topic
- difficulty_level: "beginner", "intermediate", or "advanced"
- program_type: "bsit", "bscs", or "bsis"
- The <h2> tags are ESSENTIAL - the frontend uses them to create presentation slides. Without multiple <h2> tags, the module becomes a single page.
- IMPORTANT: In code examples inside <pre><code> blocks, use single quotes instead of double quotes (e.g., x = 'hello' not x = "hello") to avoid breaking JSON formatting.
{quiz_instruction}

Return ONLY the JSON object, nothing else."""

        try:
            # Call AI to generate content
            import logging
            logger = logging.getLogger('ai_service')
            
            response = None
            original_model = model_type
            models_to_try = [model_type]
            
            # Add fallback models
            if model_type in ('gemini_direct', 'gemini', 'google_gemini'):
                models_to_try.append('openrouter_gemini')
            models_to_try.append('openrouter_gemini')  # Always have OpenRouter as last fallback
            
            # Remove duplicates while preserving order
            seen = set()
            models_to_try = [x for x in models_to_try if not (x in seen or seen.add(x))]
            
            last_error = None
            for model in models_to_try:
                try:
                    logger.info(f"Trying AI generation with model: {model}")
                    response = get_ai_response(
                        prompt=ai_prompt,
                        model_type=model,
                        json_mode=True,
                        max_tokens=8192,
                        temperature=0.7
                    )
                    if response:
                        logger.info(f"AI generation succeeded with model: {model}")
                        break
                except Exception as gen_error:
                    logger.warning(f"AI generation failed with {model}: {gen_error}")
                    last_error = gen_error
                    continue
            
            if not response:
                error_msg = f'All AI models failed. Last error: {last_error}' if last_error else 'AI returned empty response'
                logger.error(error_msg)
                return Response(
                    {'error': error_msg + '. Please try again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Clean up response - extract JSON
            response = response.strip()
            
            # Remove any fallback notification message if present
            if response.startswith('⚠️'):
                # Find where the actual JSON starts
                json_start = response.find('{')
                if json_start != -1:
                    response = response[json_start:]
            
            # Remove markdown code blocks if present
            if response.startswith('```'):
                response = re.sub(r'^```json?\s*', '', response)
                response = re.sub(r'\s*```$', '', response)
            
            # Extract JSON from between first { and last }
            first_brace = response.find('{')
            last_brace = response.rfind('}')
            if first_brace != -1 and last_brace != -1:
                response = response[first_brace:last_brace+1]
            
            logger.info(f"Cleaned JSON (first 500 chars): {response[:500]}")
            
            # Parse JSON using json_repair library (handles all LLM JSON issues)
            content = None
            
            # Strategy 1: Try raw parse first (cheapest)
            try:
                content = json.loads(response)
                logger.info("JSON parsed successfully (raw)")
            except json.JSONDecodeError:
                pass
            
            # Strategy 2: Use json_repair library (handles unescaped quotes, missing commas, etc.)
            if content is None:
                try:
                    from json_repair import repair_json
                    repaired = repair_json(response, return_objects=False)
                    content = json.loads(repaired)
                    logger.info(f"JSON parsed successfully (json_repair library)")
                except Exception as e:
                    logger.error(f"json_repair failed: {e}")
            
            # Strategy 3: json_repair with whitespace normalization
            if content is None:
                try:
                    from json_repair import repair_json
                    cleaned = response.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
                    repaired = repair_json(cleaned, return_objects=False)
                    content = json.loads(repaired)
                    logger.info(f"JSON parsed successfully (json_repair + whitespace)")
                except Exception as e:
                    logger.error(f"json_repair+whitespace failed: {e}")
            
            # Strategy 4: json_repair return_objects=True (direct object return)
            if content is None:
                try:
                    from json_repair import repair_json
                    content = repair_json(response, return_objects=True)
                    if isinstance(content, dict):
                        logger.info("JSON parsed successfully (json_repair direct object)")
                    else:
                        content = None
                except Exception as e:
                    logger.error(f"json_repair direct failed: {e}")
            
            if content is None:
                logger.error(f"All parse strategies failed")
                logger.error(f"Response length: {len(response)}, preview: {response[:500]}")
                return Response(
                    {'error': 'AI returned unparseable content. Please try again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate required fields
            if 'path' not in content or 'modules' not in content:
                return Response(
                    {'error': 'AI response missing required fields. Please try again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Ensure quizzes array exists
            if 'quizzes' not in content:
                content['quizzes'] = []
            
            return Response({
                'success': True,
                'data': content
            })
            
        except Exception as e:
            import traceback
            import logging
            logger = logging.getLogger('ai_service')
            error_traceback = traceback.format_exc()
            logger.error(f"Generate from prompt failed: {e}")
            logger.error(f"Traceback: {error_traceback}")
            print(f"ERROR in generate_from_prompt: {e}")
            print(f"TRACEBACK: {error_traceback}")
            return Response(
                {'error': f'Failed to generate content: {str(e)}', 'traceback': error_traceback},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AchievedSkillViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API for skills earned through learning activities.

    GET /learning/skills/          — list all skills for current user
    GET /learning/skills/me/       — skills grouped by category
    GET /learning/skills/summary/  — aggregate counts per source type
    """
    serializer_class = AchievedSkillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AchievedSkill.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Return skills grouped by category, sorted by most recently earned."""
        from collections import defaultdict
        skills = self.get_queryset()
        grouped = defaultdict(list)
        for skill in skills:
            grouped[skill.skill_category].append(AchievedSkillSerializer(skill).data)
        return Response({
            'total': skills.count(),
            'by_category': dict(grouped),
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return aggregate counts — how many skills per source type."""
        from django.db.models import Count
        counts = (
            self.get_queryset()
            .values('source_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        return Response({
            'total_skills': self.get_queryset().count(),
            'by_source': list(counts),
        })


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Badges API.

    GET /learning/badges/           — list user's earned badges
    GET /learning/badges/catalog/   — full catalog with earned/locked status
    """
    serializer_class = UserBadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserBadge.objects.filter(
            user=self.request.user
        ).select_related('badge')

    @action(detail=False, methods=['get'])
    def catalog(self, request):
        """
        Returns all active badges with an `earned` flag and `earned_at` for
        the current user. Frontend uses this to render locked/unlocked states.
        """
        user = request.user
        all_badges = BadgeDefinition.objects.filter(is_active=True)
        earned_map = {
            ub.badge_id: ub.earned_at
            for ub in UserBadge.objects.filter(user=user).select_related('badge')
        }

        result = []
        for badge in all_badges:
            item = BadgeDefinitionSerializer(badge).data
            item['earned'] = badge.id in earned_map
            item['earned_at'] = earned_map.get(badge.id)
            result.append(item)

        return Response({
            'total_badges': len(result),
            'earned_count': len(earned_map),
            'badges': result,
        })


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Leaderboard API.
    GET /learning/leaderboard/              — all-time top 50
    GET /learning/leaderboard/monthly/     — top this month
    GET /learning/leaderboard/weekly/      — top this week
    GET /learning/leaderboard/me/          — my rank + percentile
    GET /learning/leaderboard/categories/  — breakdown by category
    """
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [IsAuthenticated]

    def _annotate_ranks(self, qs):
        """Add rank numbers to a queryset ordered by total_points desc."""
        entries = list(qs.select_related('user'))
        for i, entry in enumerate(entries, start=1):
            entry.rank = i
        return entries

    def get_queryset(self):
        return LeaderboardSnapshot.objects.all().select_related('user')

    def list(self, request, *args, **kwargs):
        entries = self._annotate_ranks(
            LeaderboardSnapshot.objects.order_by('-total_points')[:50]
        )
        data = LeaderboardEntrySerializer(entries, many=True, context={'request': request}).data
        return Response({
            'period': 'all_time',
            'total_users': LeaderboardSnapshot.objects.count(),
            'entries': data,
        })

    @action(detail=False, methods=['get'])
    def monthly(self, request):
        entries = self._annotate_ranks(
            LeaderboardSnapshot.objects.order_by('-monthly_points')[:50]
        )
        for i, e in enumerate(entries, start=1):
            e.rank = i
        data = LeaderboardEntrySerializer(entries, many=True, context={'request': request}).data
        return Response({'period': 'monthly', 'total_users': LeaderboardSnapshot.objects.count(), 'entries': data})

    @action(detail=False, methods=['get'])
    def weekly(self, request):
        entries = self._annotate_ranks(
            LeaderboardSnapshot.objects.order_by('-weekly_points')[:50]
        )
        data = LeaderboardEntrySerializer(entries, many=True, context={'request': request}).data
        return Response({'period': 'weekly', 'total_users': LeaderboardSnapshot.objects.count(), 'entries': data})

    @action(detail=False, methods=['get'])
    def me(self, request):
        from .leaderboard_service import get_user_rank
        info = get_user_rank(request.user)
        entry = info.get('entry')
        if not entry:
            return Response({'rank': None, 'total_points': 0, 'percentile': 0, 'total_users': 0})
        entry.rank = info['rank']
        # Neighbours ±5
        rank = info['rank']
        qs = list(LeaderboardSnapshot.objects.order_by('-total_points').select_related('user'))
        start = max(0, rank - 6)
        end = min(len(qs), rank + 5)
        neighbours = qs[start:end]
        for i, n in enumerate(neighbours, start=start + 1):
            n.rank = i
        return Response({
            'rank': info['rank'],
            'total_users': info['total_users'],
            'percentile': info['percentile'],
            'total_points': info['total_points'],
            'entry': LeaderboardEntrySerializer(entry, context={'request': request}).data,
            'neighbours': LeaderboardEntrySerializer(neighbours, many=True, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Return per-category leaders: most modules, most challenges, most certs."""
        top_modules = (
            LeaderboardSnapshot.objects.order_by('-modules_completed')
            .select_related('user')[:5]
        )
        top_challenges = (
            LeaderboardSnapshot.objects.order_by('-challenges_solved')
            .select_related('user')[:5]
        )
        top_certs = (
            LeaderboardSnapshot.objects.order_by('-certificates_earned')
            .select_related('user')[:5]
        )
        def serialize(qs, start=1):
            entries = list(qs)
            for i, e in enumerate(entries, start=start):
                e.rank = i
            return LeaderboardEntrySerializer(entries, many=True, context={'request': request}).data

        return Response({
            'most_modules': serialize(top_modules),
            'most_challenges': serialize(top_challenges),
            'most_certificates': serialize(top_certs),
        })



