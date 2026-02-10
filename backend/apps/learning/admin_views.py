"""Admin views for learning module management"""
from rest_framework import viewsets, status, views, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction, models
from django.utils import timezone
from .models import CareerPath, LearningModule, Quiz, Question, QuestionChoice, UserProgress
from .serializers import (
    CareerPathSerializer, LearningModuleSerializer,
    QuizSerializer, QuestionSerializer, UserProgressSerializer
)
from apps.ai_mentor.services.module_analyzer import ModuleAnalyzerService
import json


class AdminLearningModuleViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing learning modules"""
    queryset = LearningModule.objects.all()
    serializer_class = LearningModuleSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        """Filter modules by career_path if provided"""
        queryset = LearningModule.objects.all()
        career_path = self.request.query_params.get('career_path')
        
        if career_path:
            queryset = queryset.filter(career_path_id=career_path)
        
        return queryset.order_by('order')
    
    def create(self, request, *args, **kwargs):
        """Create learning module with AI analysis"""
        # Check admin permission
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Only admins and instructors can create modules'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            with transaction.atomic():
                # Get module data safely (avoid copying file objects)
                data = {}
                for key, value in request.data.items():
                    if key not in request.FILES:  # Skip file fields
                        data[key] = value
                
                analysis_result = {}  # Initialize to avoid reference error
                
                # If file is uploaded, analyze it with AI
                uploaded_file = None
                if 'file' in request.FILES:
                    uploaded_file = request.FILES['file']
                elif 'module_file' in request.FILES:
                    uploaded_file = request.FILES['module_file']
                
                if uploaded_file:
                    # Initialize AI analyzer
                    analyzer = ModuleAnalyzerService()
                    
                    # Check if AI processing is requested
                    auto_generate = request.data.get('auto_generate_content', 'false').lower() == 'true'
                    create_slides = request.data.get('create_slides', 'false').lower() == 'true'
                    
                    if auto_generate or create_slides:
                        # Analyze the module content with AI
                        analysis_result = analyzer.analyze_module(uploaded_file)
                        
                        if analysis_result.get('success'):
                            # Merge AI analysis with provided data
                            ai_data = analysis_result.get('module_data', {})
                            
                            # Only update content if not provided manually
                            if not data.get('content') and ai_data.get('content'):
                                data['content'] = ai_data.get('content')
                            
                            # Add other AI-generated data
                            if ai_data.get('description') and not data.get('description'):
                                data['description'] = ai_data.get('description')
                            
                            # Mark as AI processed
                            data['ai_processed'] = True
                            analysis_result['auto_generated_content'] = True
                        else:
                            # Still save the module even if AI processing fails
                            analysis_result = {
                                'success': True,
                                'message': 'Module saved without AI processing',
                                'auto_generated_content': False
                            }
                    else:
                        # Just save the file without AI processing
                        analysis_result = {
                            'success': True,
                            'message': 'Module saved with uploaded file',
                            'auto_generated_content': False
                        }
                
                # Handle file upload separately
                if uploaded_file:
                    # Store the file reference in data for the serializer
                    data['file'] = uploaded_file
                
                # Fix unique constraint by getting next available order
                if 'career_path' in data:
                    try:
                        from .models import LearningModule
                        career_path_id = data['career_path']
                        
                        # Get the highest order for this career path
                        max_order = LearningModule.objects.filter(
                            career_path_id=career_path_id
                        ).aggregate(max_order=models.Max('order'))['max_order']
                        
                        print(f"DEBUG: Career Path: {career_path_id}, Max Order: {max_order}")
                        
                        # Set the next available order, ignoring user input for creation
                        # We want to append to the end
                        next_order = (max_order if max_order is not None else -1) + 1
                        print(f"DEBUG: Setting new module order to: {next_order}")
                        data['order'] = next_order
                        
                    except Exception as order_error:
                        print(f"Order calculation error: {order_error}")
                        # Use a timestamp-based fallback to ensure uniqueness
                        import time
                        data['order'] = int(time.time()) % 100000
                
                # Create the module
                serializer = self.get_serializer(data=data)
                if not serializer.is_valid():
                    print(f"Serializer validation errors: {serializer.errors}")  # Debug logging
                    print(f"Data being validated: {data}")  # Debug logging
                    return Response(
                        {
                            'error': 'Validation failed',
                            'validation_errors': serializer.errors
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                module = serializer.save()
                
                # If AI suggested quiz questions, create them
                if analysis_result.get('quiz_data'):
                    self.create_quiz_from_analysis(module, analysis_result['quiz_data'])
                
                return Response(
                    {
                        'message': 'Module created successfully',
                        'module': serializer.data,
                        'ai_analysis': analysis_result.get('summary', 'Module created without AI analysis')
                    },
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            import traceback
            # Create safe error details without file objects
            safe_data = {}
            for key, value in request.data.items():
                if key not in request.FILES:
                    safe_data[key] = value
                else:
                    safe_data[key] = f"<FILE: {value.name if hasattr(value, 'name') else 'unknown'}>"
            
            error_details = {
                'error': f'Failed to create module: {str(e)}',
                'request_data': safe_data,
                'files': list(request.FILES.keys()) if request.FILES else [],
                'error_type': type(e).__name__
            }
            print(f"Module creation error: {error_details}")  # Debug logging
            return Response(
                {'error': f'Failed to create module: {str(e)}', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def create_quiz_from_analysis(self, module, quiz_data):
        """Create quiz from AI analysis"""
        try:
            # Create quiz
            quiz = Quiz.objects.create(
                learning_module=module,
                title=quiz_data.get('title', f'Quiz for {module.title}'),
                description=quiz_data.get('description', 'Auto-generated quiz'),
                time_limit_minutes=quiz_data.get('time_limit', 30),
                passing_score=quiz_data.get('passing_score', 70)
            )
            
            # Create questions
            for q_data in quiz_data.get('questions', []):
                question = Question.objects.create(
                    quiz=quiz,
                    question_text=q_data['question'],
                    question_type=q_data.get('type', 'multiple_choice'),
                    correct_answer=q_data.get('correct_answer', {}),
                    points=q_data.get('points', 1),
                    order=q_data.get('order', 0),
                    explanation=q_data.get('explanation', '')
                )
                
                # Create choices for multiple choice questions
                if q_data.get('type') == 'multiple_choice' and 'choices' in q_data:
                    for idx, choice_text in enumerate(q_data['choices']):
                        QuestionChoice.objects.create(
                            question=question,
                            choice_text=choice_text,
                            is_correct=(idx == q_data.get('correct_index', 0)),
                            order=idx
                        )
                        
        except Exception as e:
            print(f"Error creating quiz: {str(e)}")
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def bulk_create(self, request):
        """Bulk create modules from structured data"""
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Only admins and instructors can bulk create modules'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            modules_data = request.data.get('modules', [])
            created_modules = []
            
            with transaction.atomic():
                for module_data in modules_data:
                    serializer = self.get_serializer(data=module_data)
                    serializer.is_valid(raise_exception=True)
                    module = serializer.save()
                    created_modules.append(serializer.data)
            
            return Response(
                {
                    'message': f'{len(created_modules)} modules created successfully',
                    'modules': created_modules
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': f'Bulk creation failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reorder(self, request, pk=None):
        """Reorder modules within a career path"""
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        module = self.get_object()
        new_order = request.data.get('order')
        
        if new_order is None:
            return Response(
                {'error': 'Order value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update module orders
            career_path = module.career_path
            modules = LearningModule.objects.filter(career_path=career_path).order_by('order')
            
            # Reorder modules
            for mod in modules:
                if mod.id == module.id:
                    continue
                if mod.order >= new_order:
                    mod.order += 1
                    mod.save()
            
            module.order = new_order
            module.save()
            
            return Response({'message': 'Module reordered successfully'})
            
        except Exception as e:
            return Response(
                {'error': f'Failed to reorder: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminCareerPathViewSet(viewsets.ModelViewSet):
    """Admin viewset for managing career paths"""
    queryset = CareerPath.objects.all()
    serializer_class = CareerPathSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Create career path - admin and instructor"""
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Only admins and instructors can create career paths'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Validate required fields
            required_fields = ['name', 'description', 'program_type', 'difficulty_level', 'estimated_duration']
            missing_fields = [field for field in required_fields if not request.data.get(field)]
            
            if missing_fields:
                return Response(
                    {
                        'error': 'Missing required fields',
                        'missing_fields': missing_fields,
                        'required_fields': required_fields
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate estimated_duration range (1-52 weeks)
            duration = request.data.get('estimated_duration')
            try:
                duration = int(duration)
                if duration < 1 or duration > 52:
                    return Response(
                        {'error': 'estimated_duration must be between 1 and 52 weeks'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {'error': 'estimated_duration must be a valid integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Prepare data for serializer (exclude read-only fields)
            # Don't use .copy() with file uploads - causes pickle errors
            # Instead, create a new dict manually
            data = {}
            for key, value in request.data.items():
                # Skip read-only fields
                if key not in ['total_modules', 'enrolled_count', 'id', 'created_at', 'updated_at']:
                    data[key] = value
            
            # Auto-generate slug from name if not provided
            if not data.get('slug') and data.get('name'):
                from django.utils.text import slugify
                import uuid as uuid_module
                base_slug = slugify(data['name'])
                slug = base_slug
                
                # Check if slug already exists and append a suffix if needed
                counter = 1
                while CareerPath.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                    if counter > 100:  # Safety limit
                        slug = f"{base_slug}-{str(uuid_module.uuid4())[:8]}"
                        break
                
                data['slug'] = slug
            
            # Create the career path using serializer
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            return Response(
                {
                    'message': 'Career path created successfully',
                    'data': serializer.data
                },
                status=status.HTTP_201_CREATED
            )
            
        except serializers.ValidationError as e:
            # Log the validation error for debugging
            print(f"Validation error: {e.detail}")
            return Response(
                {
                    'error': 'Validation error',
                    'details': e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Log the exception for debugging
            print(f"Exception creating career path: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {
                    'error': 'Failed to create career path',
                    'details': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """Update career path - admin and instructor"""
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Only admins and instructors can update career paths'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Prepare data for serializer (exclude read-only fields)
            # Don't use .copy() with file uploads - causes pickle errors
            # Instead, create a new dict manually
            data = {}
            for key, value in request.data.items():
                # Skip read-only fields
                if key not in ['total_modules', 'enrolled_count', 'id', 'created_at', 'updated_at']:
                    data[key] = value
            
            # Auto-generate slug from name if not provided and name is being updated
            if not data.get('slug') and data.get('name'):
                from django.utils.text import slugify
                data['slug'] = slugify(data['name'])
            
            # Get the instance
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            
            # Update using serializer
            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response({
                'message': 'Career path updated successfully',
                'data': serializer.data
            })
            
        except serializers.ValidationError as e:
            # Log the validation error for debugging
            print(f"Validation error on update: {e.detail}")
            return Response(
                {
                    'error': 'Validation error',
                    'details': e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Log the exception for debugging
            print(f"Exception updating career path: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {
                    'error': 'Failed to update career path',
                    'details': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """Delete career path - admin and instructor"""
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Only admins and instructors can delete career paths'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def publish(self, request, pk=None):
        """Publish/unpublish a career path"""
        if request.user.role != 'admin' and request.user.role != 'instructor':
            return Response(
                {'error': 'Only admins and instructors can publish career paths'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        career_path = self.get_object()
        career_path.is_active = not career_path.is_active
        career_path.save()
        
        status_text = 'published' if career_path.is_active else 'unpublished'
        return Response({'message': f'Career path {status_text} successfully'})
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def statistics(self, request):
        """Get career path statistics - accessible by admin and instructor"""
        if request.user.role not in ['admin', 'instructor']:
            return Response(
                {'error': 'Only admins and instructors can view statistics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import Enrollment, Quiz
        
        stats = {
            'total_paths': CareerPath.objects.count(),
            'active_paths': CareerPath.objects.filter(is_active=True).count(),
            'total_modules': LearningModule.objects.count(),
            'total_quizzes': Quiz.objects.count(),
            'total_enrollments': Enrollment.objects.filter(status__in=['active', 'completed']).count(),
            'completed_enrollments': Enrollment.objects.filter(status='completed').count(),
            'total_students': UserProgress.objects.values('user').distinct().count(),
            'by_program': {}
        }
        
        # Stats by program
        for choice in CareerPath.PROGRAM_CHOICES:
            program = choice[0]
            stats['by_program'][program] = {
                'paths': CareerPath.objects.filter(program_type=program).count(),
                'modules': LearningModule.objects.filter(career_path__program_type=program).count(),
                'enrollments': Enrollment.objects.filter(
                    career_path__program_type=program, 
                    status__in=['active', 'completed']
                ).count()
            }
        
        return Response(stats)
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def enrolled_students(self, request, pk=None):
        """Get all students enrolled in a specific career path"""
        if request.user.role not in ['admin', 'instructor']:
            return Response(
                {'error': 'Only admins and instructors can view enrolled students'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import Enrollment, ModuleProgress
        from apps.accounts.models import User
        
        career_path = self.get_object()
        
        # Get all enrollments for this path
        enrollments = Enrollment.objects.filter(
            career_path=career_path
        ).select_related('user').order_by('-enrolled_at')
        
        students_data = []
        for enrollment in enrollments:
            user = enrollment.user
            
            # Get module progress for this user in this path
            completed_modules = UserProgress.objects.filter(
                user=user,
                career_path=career_path,
                is_completed=True
            ).count()
            
            total_modules = career_path.modules.count()
            
            students_data.append({
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                'enrollment_id': str(enrollment.id),
                'enrolled_at': enrollment.enrolled_at,
                'status': enrollment.status,
                'progress_percentage': enrollment.progress_percentage,
                'completed_modules': completed_modules,
                'total_modules': total_modules,
                'completed_at': enrollment.completed_at,
            })
        
        return Response({
            'career_path': {
                'id': str(career_path.id),
                'name': career_path.name,
                'slug': career_path.slug,
            },
            'total_enrolled': len(students_data),
            'students': students_data
        })
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def student_progress(self, request, pk=None):
        """Get detailed progress for a specific student in a career path"""
        if request.user.role not in ['admin', 'instructor']:
            return Response(
                {'error': 'Only admins and instructors can view student progress'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import Enrollment, ModuleProgress, QuizAttempt
        
        career_path = self.get_object()
        student_id = request.query_params.get('student_id')
        
        if not student_id:
            return Response(
                {'error': 'student_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.accounts.models import User
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get enrollment
        try:
            enrollment = Enrollment.objects.get(user=student, career_path=career_path)
        except Enrollment.DoesNotExist:
            return Response(
                {'error': 'Student is not enrolled in this career path'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all modules and their progress
        modules = career_path.modules.all().order_by('order')
        module_progress = []
        
        for module in modules:
            progress = UserProgress.objects.filter(
                user=student,
                career_path=career_path,
                learning_module=module
            ).first()
            
            # Get quiz attempts for this module
            quiz_attempts = []
            for quiz in module.quizzes.all():
                attempts = QuizAttempt.objects.filter(
                    user=student,
                    quiz=quiz
                ).order_by('-started_at')[:3]  # Last 3 attempts
                
                quiz_attempts.append({
                    'quiz_id': str(quiz.id),
                    'quiz_title': quiz.title,
                    'attempts': [
                        {
                            'id': str(a.id),
                            'score': float(a.score),
                            'status': a.status,
                            'started_at': a.started_at,
                            'submitted_at': a.submitted_at,
                        } for a in attempts
                    ],
                    'best_score': max([float(a.score) for a in attempts]) if attempts else None
                })
            
            module_progress.append({
                'module_id': str(module.id),
                'title': module.title,
                'order': module.order,
                'completion_percentage': progress.completion_percentage if progress else 0,
                'is_completed': progress.is_completed if progress else False,
                'current_slide': progress.current_slide if progress else 0,
                'total_slides': progress.total_slides if progress else 0,
                'started_at': progress.started_at if progress else None,
                'completed_at': progress.completed_at if progress else None,
                'last_accessed': progress.last_accessed_at if progress else None,
                'quizzes': quiz_attempts
            })
        
        return Response({
            'student': {
                'id': str(student.id),
                'username': student.username,
                'email': student.email,
                'full_name': f"{student.first_name} {student.last_name}".strip() or student.username,
            },
            'career_path': {
                'id': str(career_path.id),
                'name': career_path.name,
            },
            'enrollment': {
                'id': str(enrollment.id),
                'status': enrollment.status,
                'progress_percentage': enrollment.progress_percentage,
                'enrolled_at': enrollment.enrolled_at,
                'completed_at': enrollment.completed_at,
            },
            'modules': module_progress,
            'summary': {
                'total_modules': len(modules),
                'completed_modules': sum(1 for m in module_progress if m['is_completed']),
                'overall_percentage': enrollment.progress_percentage,
            }
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def instructor_dashboard(self, request):
        """Get comprehensive dashboard data for instructors"""
        if request.user.role not in ['admin', 'instructor']:
            return Response(
                {'error': 'Only admins and instructors can access dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .models import Enrollment, Quiz, Certificate
        from django.db.models import Count, Avg
        
        # Get all career paths with enrollment counts
        paths = CareerPath.objects.annotate(
            enrolled_count=Count('enrollments', filter=models.Q(enrollments__status__in=['active', 'completed'])),
            completed_count=Count('enrollments', filter=models.Q(enrollments__status='completed'))
        ).order_by('-is_featured', 'name')
        
        # Serialize paths with stats
        paths_data = []
        for path in paths:
            paths_data.append({
                'id': str(path.id),
                'name': path.name,
                'slug': path.slug,
                'program_type': path.program_type,
                'difficulty_level': path.difficulty_level,
                'is_active': path.is_active,
                'total_modules': path.modules.count(),
                'enrolled_count': path.enrolled_count,
                'completed_count': path.completed_count,
                'created_at': path.created_at,
            })
        
        # Recent enrollments
        recent_enrollments = Enrollment.objects.select_related(
            'user', 'career_path'
        ).order_by('-enrolled_at')[:10]
        
        recent_data = [{
            'id': str(e.id),
            'student_name': f"{e.user.first_name} {e.user.last_name}".strip() or e.user.username,
            'student_email': e.user.email,
            'career_path_name': e.career_path.name,
            'enrolled_at': e.enrolled_at,
            'progress': e.progress_percentage,
            'status': e.status,
        } for e in recent_enrollments]
        
        # Overall stats
        stats = {
            'total_paths': CareerPath.objects.count(),
            'active_paths': CareerPath.objects.filter(is_active=True).count(),
            'total_modules': LearningModule.objects.count(),
            'total_quizzes': Quiz.objects.count(),
            'total_enrollments': Enrollment.objects.filter(status__in=['active', 'completed']).count(),
            'completed_enrollments': Enrollment.objects.filter(status='completed').count(),
            'total_certificates': Certificate.objects.count(),
            'avg_completion_rate': Enrollment.objects.filter(
                status='completed'
            ).count() * 100 // max(Enrollment.objects.count(), 1),
        }
        
        return Response({
            'stats': stats,
            'career_paths': paths_data,
            'recent_enrollments': recent_data,
        })


class LearningProgressView(views.APIView):
    """View for tracking user learning progress"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's learning progress"""
        user = request.user
        
        # Get all user progress
        progress = UserProgress.objects.filter(user=user).select_related('career_path', 'learning_module')
        
        # Organize by career path
        progress_data = {}
        for prog in progress:
            path_id = str(prog.career_path.id)
            if path_id not in progress_data:
                progress_data[path_id] = {
                    'career_path': CareerPathSerializer(prog.career_path).data,
                    'overall_progress': 0,
                    'modules': []
                }
            
            if prog.learning_module:
                progress_data[path_id]['modules'].append({
                    'module': LearningModuleSerializer(prog.learning_module).data,
                    'completion': prog.completion_percentage,
                    'is_completed': prog.is_completed,
                    'last_accessed': prog.last_accessed_at
                })
        
        # Calculate overall progress for each path
        for path_id in progress_data:
            modules = progress_data[path_id]['modules']
            if modules:
                total_completion = sum(m['completion'] for m in modules)
                progress_data[path_id]['overall_progress'] = int(total_completion / len(modules))
        
        return Response({
            'progress': list(progress_data.values()),
            'total_paths_enrolled': len(progress_data)
        })
    
    def post(self, request):
        """Update user's progress on a module"""
        module_id = request.data.get('module_id')
        completion_percentage = request.data.get('completion_percentage', 0)
        
        if not module_id:
            return Response(
                {'error': 'module_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            module = LearningModule.objects.get(id=module_id)
            
            # Get or create progress
            progress, created = UserProgress.objects.get_or_create(
                user=request.user,
                career_path=module.career_path,
                learning_module=module,
                defaults={'completion_percentage': completion_percentage}
            )
            
            if not created:
                progress.completion_percentage = max(progress.completion_percentage, completion_percentage)
                
                if completion_percentage >= 100:
                    progress.is_completed = True
                    progress.completed_at = timezone.now()
                
                progress.save()
            
            return Response({
                'message': 'Progress updated successfully',
                'progress': UserProgressSerializer(progress).data
            })
            
        except LearningModule.DoesNotExist:
            return Response(
                {'error': 'Module not found'},
                status=status.HTTP_404_NOT_FOUND
            )
