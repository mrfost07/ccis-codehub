"""
Views for Learning app
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import (
    CareerPath, LearningModule, Quiz, Question, QuestionChoice,
    UserProgress, QuizAttempt, Answer, Certificate, Enrollment, ModuleProgress
)
from .serializers import (
    CareerPathSerializer, LearningModuleSerializer, QuizSerializer,
    QuestionSerializer, UserProgressSerializer, QuizAttemptSerializer,
    CertificateSerializer, EnrollmentSerializer, ModuleProgressSerializer
)


class CareerPathViewSet(viewsets.ModelViewSet):
    """ViewSet for CareerPath"""
    queryset = CareerPath.objects.filter(is_active=True)
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


class LearningModuleViewSet(viewsets.ModelViewSet):
    """ViewSet for LearningModule"""
    queryset = LearningModule.objects.all()
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
            
            # Update user profile stats (increment module count, not course count)
            try:
                profile = user.profile
                profile.total_modules_completed = UserProgress.objects.filter(
                    user=user, is_completed=True
                ).count()
                profile.save(update_fields=['total_modules_completed'])
            except Exception as e:
                print(f"Could not update profile module count: {e}")
            
            # Check if all modules completed and award certificate
            self.check_and_award_certificate(user, module.career_path)
        
        return Response({
            'detail': 'Module marked as completed',
            'points_earned': module.points_reward,
            'is_completed': True
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
        """Check if user completed all modules and award certificate"""
        try:
            from .models import Certificate, Enrollment
            from django.db import transaction
            
            # Get all modules in this path
            total_modules = LearningModule.objects.filter(career_path=career_path).count()
            
            if total_modules == 0:
                return  # No modules, nothing to complete
            
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
                        
                        # Generate PDF certificate (async-safe)
                        self._generate_certificate_pdf(cert, career_path)
                        
        except Exception as e:
            # Don't fail the request if certificate awarding fails
            print(f"Error awarding certificate: {e}")
    
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
        queryset = Quiz.objects.all()
        learning_module = self.request.query_params.get('learning_module', None)
        if learning_module:
            queryset = queryset.filter(learning_module_id=learning_module)
        return queryset
    
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
        
        # Get active attempt
        try:
            attempt = QuizAttempt.objects.get(
                user=user,
                quiz=quiz,
                status='in_progress'
            )
        except QuizAttempt.DoesNotExist:
            return Response(
                {'detail': 'No active quiz attempt found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process answers
        total_points = 0
        earned_points = 0
        
        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            user_answer = answer_data.get('answer')
            
            question = get_object_or_404(Question, id=question_id, quiz=quiz)
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
        
        return Response({
            'score': score,
            'passed': score >= quiz.passing_score,
            'earned_points': earned_points,
            'total_points': total_points
        })
    
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
        queryset = UserProgress.objects.filter(user=self.request.user)
        
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
        return Certificate.objects.filter(user=self.request.user)


class EnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Enrollment"""
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Enrollment.objects.filter(user=self.request.user)
    
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
        return ModuleProgress.objects.filter(user=self.request.user)
    
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
            "content": "<h2>Introduction</h2><p>Module content with HTML formatting...</p><h3>Key Concepts</h3><ul><li>Point 1</li><li>Point 2</li></ul>",
            "module_type": "text",
            "difficulty_level": "beginner",
            "duration_minutes": 30,
            "order": 1
        }}
    ],
    "quizzes": []
}}

Requirements:
- Generate exactly {module_count} modules
- Each module should have rich HTML content (500+ words with headers, paragraphs, lists, code examples where appropriate)
- difficulty_level: "beginner", "intermediate", or "advanced"
- program_type: "bsit", "bscs", or "bsis"
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
                        model_type=model
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
            
            # Comprehensive JSON repair function
            def repair_json(s):
                """Aggressively repair malformed JSON from AI"""
                import re as regex
                
                # Step 1: Remove any text before first { and after last }
                first_brace = s.find('{')
                last_brace = s.rfind('}')
                if first_brace != -1 and last_brace != -1:
                    s = s[first_brace:last_brace+1]
                
                # Step 2: Replace control characters
                s = s.replace('\t', ' ')
                s = s.replace('\r\n', ' ')
                s = s.replace('\r', ' ')
                s = s.replace('\n', ' ')
                
                # Step 3: Fix unescaped quotes in string values
                # This is tricky - we need to escape quotes that aren't structural
                def fix_string_content(match):
                    content = match.group(1)
                    # Escape any unescaped quotes inside the string
                    fixed = regex.sub(r'(?<!\\)"', '\\"', content)
                    return '"' + fixed + '"'
                
                # Step 4: Fix trailing commas before ] or }
                s = regex.sub(r',\s*([}\]])', r'\1', s)
                
                # Step 5: Fix missing commas between values
                # Pattern: "value" "key" should be "value", "key"
                s = regex.sub(r'"\s+"', '", "', s)
                # Pattern: }\s*{ should be }, {
                s = regex.sub(r'\}\s*\{', '}, {', s)
                # Pattern: ]\s*[ should be ], [
                s = regex.sub(r'\]\s*\[', '], [', s)
                # Pattern: "value"\s*"key": should be "value", "key":
                s = regex.sub(r'"\s*"([^"]+)":', '", "\\1":', s)
                # Pattern: }\s*"key": should be }, "key":
                s = regex.sub(r'\}\s*"([^"]+)":', '}, "\\1":', s)
                # Pattern: ]\s*"key": should be ], "key":
                s = regex.sub(r'\]\s*"([^"]+)":', '], "\\1":', s)
                
                # Step 6: Remove any remaining control characters
                s = ''.join(char if ord(char) >= 32 or char in '\n\r\t' else ' ' for char in s)
                s = s.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
                
                # Step 7: Collapse multiple spaces
                s = regex.sub(r'\s+', ' ', s)
                
                return s
            
            response = repair_json(response)
            logger.info(f"Repaired JSON (first 500 chars): {response[:500]}")
            
            # Parse JSON with multiple fallback attempts
            content = None
            parse_errors = []
            
            for attempt_name, json_str in [("repaired", response), ("strict_false", response)]:
                try:
                    if attempt_name == "strict_false":
                        content = json.loads(json_str, strict=False)
                    else:
                        content = json.loads(json_str)
                    logger.info(f"JSON parsed successfully with {attempt_name}")
                    break
                except json.JSONDecodeError as e:
                    parse_errors.append(f"{attempt_name}: {str(e)}")
                    continue
            
            if content is None:
                # Final attempt: extract just the structure we need manually
                try:
                    # Try to find and parse just the path object
                    path_match = re.search(r'"path"\s*:\s*(\{[^}]+\})', response)
                    modules_match = re.search(r'"modules"\s*:\s*(\[[^\]]*\])', response)
                    
                    if path_match and modules_match:
                        content = {
                            'path': json.loads(path_match.group(1), strict=False),
                            'modules': json.loads(modules_match.group(1), strict=False),
                            'quizzes': []
                        }
                        logger.info("Parsed using regex extraction fallback")
                except Exception as extract_error:
                    parse_errors.append(f"extraction: {str(extract_error)}")
            
            if content is None:
                return Response(
                    {'error': f'AI returned unparseable content. Errors: {"; ".join(parse_errors)}. Please try again.'},
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
