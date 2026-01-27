"""
Core views for the application
"""
from django.http import JsonResponse
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.decorators import login_required
from django.views.generic import TemplateView
from django.conf import settings


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """API root endpoint with available endpoints"""
    return Response({
        'message': 'Welcome to CCIS-CodeHub API',
        'version': '1.0.0',
        'endpoints': {
            'auth': {
                'login': '/api/auth/login/',
                'register': '/api/auth/register/',
                'profile': '/api/auth/profile/',
            },
            'learning': {
                'career-paths': '/api/learning/career-paths/',
                'modules': '/api/learning/modules/',
                'quizzes': '/api/learning/quizzes/',
                'progress': '/api/learning/progress/',
            },
            'projects': {
                'list': '/api/projects/projects/',
                'tasks': '/api/projects/tasks/',
                'reviews': '/api/projects/reviews/',
            },
            'community': {
                'posts': '/api/community/posts/',
                'comments': '/api/community/comments/',
                'notifications': '/api/community/notifications/',
            },
            'ai': {
                'sessions': '/api/ai/sessions/',
                'code-analysis': '/api/ai/code-analysis/',
                'recommendations': '/api/ai/recommendations/',
                'models': '/api/ai/models/',
            },
            'competitions': {
                'list': '/api/competitions/competitions/',
                'leaderboard': '/api/competitions/leaderboard/',
            },
            'documentation': {
                'swagger': '/api/schema/swagger-ui/',
                'redoc': '/api/schema/redoc/',
                'schema': '/api/schema/',
            }
        },
        'status': 'operational',
        'frontend_url': settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
    })


def root_view(request):
    """Root view that shows backend info"""
    return JsonResponse({
        'message': 'CCIS-CodeHub Backend Server',
        'version': '1.0.0',
        'status': 'operational',
        'endpoints': {
            'api': 'http://localhost:8000/api/',
            'admin': 'http://localhost:8000/admin/',
            'docs': 'http://localhost:8000/api/schema/swagger-ui/',
            'frontend': 'http://localhost:3000'
        },
        'info': 'This is the backend API server. Visit /api/ for API endpoints or /admin/ for admin panel.'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'service': 'CCIS-CodeHub API',
        'timestamp': __import__('datetime').datetime.now().isoformat()
    })


@api_view(['GET'])
def admin_analytics(request):
    """
    Comprehensive analytics for admin dashboard
    Returns all database metrics for charts and graphs
    """
    from rest_framework.permissions import IsAuthenticated
    from django.db.models import Count, Avg, Q
    from django.db.models.functions import TruncMonth, TruncDate
    from django.utils import timezone
    from datetime import timedelta
    
    # Import all models
    from apps.accounts.models import User, UserProfile
    from apps.learning.models import CareerPath, LearningModule, Quiz, Enrollment, QuizAttempt, UserProgress
    from apps.projects.models import Project, Team, ProjectTask, TeamMembership
    from apps.community.models import Post, Comment, PostLike, Notification
    
    # Check if user is admin
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    
    # ========== USER ANALYTICS ==========
    users = User.objects.all()
    
    # Users by Role
    users_by_role = list(users.values('role').annotate(count=Count('id')))
    
    # Users by Program
    users_by_program = list(users.values('program').annotate(count=Count('id')))
    
    # Users by Year Level
    users_by_year = list(users.values('year_level').annotate(count=Count('id')))
    
    # User Registration Trend (last 6 months)
    six_months_ago = now - timedelta(days=180)
    registration_trend = list(
        users.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    
    # Active users (logged in last 30 days)
    active_users = users.filter(last_login__gte=thirty_days_ago).count()
    
    # Instructors with student counts (students enrolled in their courses)
    instructors_qs = users.filter(role='instructor')
    instructor_list = []
    for instructor in instructors_qs:
        # Count students enrolled in career paths (simplified - all enrollments)
        student_count = Enrollment.objects.count()  # In real scenario, filter by instructor's courses
        instructor_list.append({
            'id': str(instructor.id),
            'username': instructor.username,
            'first_name': instructor.first_name,
            'last_name': instructor.last_name,
            'email': instructor.email,
            'program': instructor.program,
            'profile_picture': instructor.profile_picture.url if instructor.profile_picture else None,
            'student_count': student_count
        })
    
    # Students list with their enrollment info
    students_qs = users.filter(role='student')[:100]  # Limit to 100 for performance
    students = []
    for student in students_qs:
        students.append({
            'id': str(student.id),
            'username': student.username,
            'first_name': student.first_name,
            'last_name': student.last_name,
            'email': student.email,
            'program': student.program,
            'year_level': student.year_level,
            'created_at': student.created_at.isoformat() if student.created_at else None,
            'is_active': student.is_active,
            'profile_picture': student.profile_picture.url if student.profile_picture else None,
        })
    
    # ========== LEARNING ANALYTICS ==========
    career_paths = CareerPath.objects.all()
    modules = LearningModule.objects.all()
    quizzes = Quiz.objects.all()
    
    # Career paths stats
    path_stats = {
        'total': career_paths.count(),
        'active': career_paths.filter(is_active=True).count(),
        'by_program': list(career_paths.values('program_type').annotate(count=Count('id'))),
        'by_difficulty': list(career_paths.values('difficulty_level').annotate(count=Count('id'))),
    }
    
    # Modules by type
    modules_by_type = list(modules.values('module_type').annotate(count=Count('id')))
    
    # Quiz stats
    quiz_stats = {
        'total': quizzes.count(),
        'avg_passing_score': quizzes.aggregate(avg=Avg('passing_score'))['avg'] or 0,
    }
    
    # Enrollment stats
    enrollments = Enrollment.objects.all()
    enrollment_stats = {
        'total': enrollments.count(),
        'by_path': list(enrollments.values('career_path__name').annotate(count=Count('id'))[:10]),
        'recent': enrollments.filter(enrolled_at__gte=thirty_days_ago).count(),
    }
    
    # Quiz attempts / performance
    quiz_attempts = QuizAttempt.objects.filter(status='completed')
    quiz_performance = {
        'total_attempts': quiz_attempts.count(),
        'avg_score': quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0,
        'passed': quiz_attempts.filter(score__gte=70).count(),
        'failed': quiz_attempts.filter(score__lt=70).count(),
    }
    
    # ========== PROJECT ANALYTICS ==========
    projects = Project.objects.all()
    
    # Projects by status
    projects_by_status = list(projects.values('status').annotate(count=Count('id')))
    
    # Projects by type
    projects_by_type = list(projects.values('project_type').annotate(count=Count('id')))
    
    # Team stats
    teams = Team.objects.all()
    team_stats = {
        'total': teams.count(),
        'active': teams.filter(is_active=True).count(),
    }
    
    # Task stats
    tasks = ProjectTask.objects.all()
    tasks_by_status = list(tasks.values('status').annotate(count=Count('id')))
    
    # ========== COMMUNITY ANALYTICS ==========
    posts = Post.objects.all()
    
    # Posts by type
    posts_by_type = list(posts.values('post_type').annotate(count=Count('id')))
    
    # Engagement metrics
    engagement = {
        'total_posts': posts.count(),
        'total_comments': Comment.objects.count(),
        'total_likes': PostLike.objects.count(),
        'total_views': posts.aggregate(total=Count('view_count'))['total'] or 0,
        'recent_posts': posts.filter(created_at__gte=thirty_days_ago).count(),
    }
    
    # Post trend (last 30 days)
    post_trend = list(
        posts.filter(created_at__gte=thirty_days_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    
    # ========== SUMMARY STATS ==========
    summary = {
        'total_users': users.count(),
        'total_students': users.filter(role='student').count(),
        'total_instructors': users.filter(role='instructor').count(),
        'total_admins': users.filter(role='admin').count(),
        'total_career_paths': path_stats['total'],
        'total_modules': modules.count(),
        'total_quizzes': quizzes.count(),
        'total_enrollments': enrollment_stats['total'],
        'total_projects': projects.count(),
        'total_teams': team_stats['total'],
        'total_tasks': tasks.count(),
        'total_posts': engagement['total_posts'],
        'total_comments': engagement['total_comments'],
        'active_users_30d': active_users,
    }
    
    return Response({
        'summary': summary,
        'users': {
            'by_role': users_by_role,
            'by_program': users_by_program,
            'by_year': users_by_year,
            'registration_trend': registration_trend,
            'instructors': instructor_list,
            'students': students,
        },
        'learning': {
            'paths': path_stats,
            'modules_by_type': modules_by_type,
            'quiz_stats': quiz_stats,
            'enrollment_stats': enrollment_stats,
            'quiz_performance': quiz_performance,
        },
        'projects': {
            'by_status': projects_by_status,
            'by_type': projects_by_type,
            'teams': team_stats,
            'tasks_by_status': tasks_by_status,
        },
        'community': {
            'posts_by_type': posts_by_type,
            'engagement': engagement,
            'post_trend': post_trend,
        }
    })


@api_view(['GET'])
def admin_projects(request):
    """
    Get all projects for admin dashboard (no ownership filtering)
    """
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    if not (request.user.is_staff or request.user.is_superuser or request.user.role == 'admin'):
        return Response({'error': 'Admin access required'}, status=403)
    
    from apps.projects.models import Project, Team
    
    # Get all projects with related data
    projects = Project.objects.select_related('owner', 'team').all().order_by('-created_at')
    
    project_list = []
    for p in projects:
        project_list.append({
            'id': str(p.id),
            'name': p.name,
            'slug': p.slug,
            'description': p.description or '',
            'status': p.status,
            'project_type': p.project_type,
            'team': str(p.team.id) if p.team else None,
            'team_name': p.team.name if p.team else None,
            'owner': str(p.owner.id),
            'owner_name': p.owner.username,
            'owner_picture': p.owner.profile_picture.url if p.owner.profile_picture else None,
            'member_count': p.memberships.filter(is_active=True).count() + 1,
            'task_count': p.tasks.count(),
            'created_at': p.created_at.isoformat(),
        })
    
    return Response(project_list)


@api_view(['GET'])
def admin_tasks(request):
    """
    Get all tasks for admin dashboard (no ownership filtering)
    """
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
    
    if not (request.user.is_staff or request.user.is_superuser or request.user.role == 'admin'):
        return Response({'error': 'Admin access required'}, status=403)
    
    from apps.projects.models import ProjectTask
    
    # Get all tasks with related data
    tasks = ProjectTask.objects.select_related('project', 'assigned_to').all().order_by('-created_at')
    
    task_list = []
    for t in tasks:
        task_list.append({
            'id': str(t.id),
            'title': t.title,
            'description': t.description or '',
            'status': t.status,
            'priority': t.priority,
            'project': str(t.project.id),
            'project_name': t.project.name,
            'assigned_to': str(t.assigned_to.id) if t.assigned_to else None,
            'assigned_to_name': t.assigned_to.username if t.assigned_to else None,
            'assigned_to_picture': t.assigned_to.profile_picture.url if t.assigned_to and t.assigned_to.profile_picture else None,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'created_at': t.created_at.isoformat(),
        })
    
    return Response(task_list)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_app_settings(request):
    """
    Return runtime app settings based on user role
    Feature flags that can be toggled without rebuilding frontend
    
    Response:
    {
        "success": true,
        "features": {
            "ai_mentor": true,
            "code_editor": true,
            "user_delete": false,  # admin only
            ...
        }
    }
    """
    # Default features for non-authenticated users
    features = {
        'ai_mentor': True,
        'code_editor': True,
        'competitions': True,
        'projects': True,
        'community': True,
        'learning_paths': True,
        'analytics': False,
        'user_delete': False,
    }
    
    # For authenticated users, get from database settings
    if request.user.is_authenticated:
        try:
            # Import here to avoid circular imports
            from apps.accounts.models import AppSettings
            
            settings_obj = AppSettings.get_settings()
            features = {
                'ai_mentor': settings_obj.enable_ai_mentor,
                'code_editor': settings_obj.enable_code_editor,
                'competitions': settings_obj.enable_competitions,
                'projects': settings_obj.enable_projects,
                'community': settings_obj.enable_community,
                'learning_paths': settings_obj.enable_learning_paths,
            }
            
            # Admin-only features
            if request.user.is_staff or request.user.role == 'admin':
                features['analytics'] = settings_obj.enable_analytics
                features['user_delete'] = settings_obj.enable_user_delete
            else:
                features['analytics'] = False
                features['user_delete'] = False
        except Exception as e:
            # Fallback to defaults if something goes wrong
            print(f"Error fetching app settings: {e}")
            pass
    
    return Response({
        'success': True,
        'features': features
    })


