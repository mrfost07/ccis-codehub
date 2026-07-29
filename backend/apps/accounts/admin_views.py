"""Admin views for dashboard statistics and management"""
from rest_framework import views, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsPlatformAdmin
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from apps.learning.models import CareerPath, LearningModule, UserProgress
from apps.community.models import Post, Comment
from apps.projects.models import Project
from apps.competitions.models import Competition
from apps.ai_mentor.models import ProjectMentorSession

User = get_user_model()


class AdminDashboardView(views.APIView):
    """Admin dashboard statistics"""
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        """Get dashboard statistics"""
        # Nineteen separate COUNT queries, several of them guarded by an
        # additional .exists() that cost another round-trip and changed
        # nothing (count() already returns 0 on an empty table). Grouped into
        # one aggregate per table: same numbers, a third of the round-trips,
        # which matters because the database is ~230 ms away.
        day_ago = timezone.now() - timedelta(days=1)

        user_stats = User.objects.aggregate(
            total=Count('id'),
            students=Count('id', filter=Q(role='student')),
            instructors=Count('id', filter=Q(role='instructor')),
            new_today=Count('id', filter=Q(created_at__gte=day_ago)),
        )
        total_users = user_stats['total']
        total_students = user_stats['students']
        total_instructors = user_stats['instructors']
        new_users_today = user_stats['new_today']

        course_stats = CareerPath.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(is_active=True)),
        )
        total_courses = course_stats['total']
        active_courses = course_stats['active']
        total_enrollments = UserProgress.objects.count()

        post_stats = Post.objects.aggregate(
            total=Count('id'),
            today=Count('id', filter=Q(created_at__gte=day_ago)),
        )
        total_posts = post_stats['total']
        posts_today = post_stats['today']
        total_comments = Comment.objects.count()

        project_stats = Project.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(status='active')),
        )
        total_projects = project_stats['total']
        active_projects = project_stats['active']

        competition_stats = Competition.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(status='active')),
        )
        total_competitions = competition_stats['total']
        active_competitions = competition_stats['active']

        ai_stats = ProjectMentorSession.objects.aggregate(
            total=Count('id'),
            today=Count('id', filter=Q(started_at__gte=day_ago)),
        )
        total_ai_sessions = ai_stats['total']
        ai_sessions_today = ai_stats['today']
        
        # Recent activities
        recent_users = User.objects.order_by('-created_at')[:5]
        recent_posts = Post.objects.select_related('author').order_by('-created_at')[:5]
        
        recent_activities = []
        
        for user in recent_users:
            recent_activities.append({
                'type': 'user_registration',
                'message': f'New user registered: {user.username}',
                'timestamp': user.created_at,
                'icon': 'user'
            })
        
        for post in recent_posts:
            recent_activities.append({
                'type': 'community_post',
                'message': f'{post.author.username} created a post',
                'timestamp': post.created_at,
                'icon': 'message'
            })
        
        # Sort activities by timestamp
        recent_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activities = recent_activities[:10]  # Limit to 10 most recent
        
        return Response({
            'totalUsers': total_users,
            'totalStudents': total_students,
            'totalInstructors': total_instructors,
            'newUsersToday': new_users_today,
            'totalCourses': total_courses,
            'activeCourses': active_courses,
            'totalEnrollments': total_enrollments,
            'totalProjects': total_projects,
            'activeProjects': active_projects,
            'activeCompetitions': active_competitions,
            'totalCompetitions': total_competitions,
            'communityPosts': total_posts,
            'communityComments': total_comments,
            'postsToday': posts_today,
            'aiInteractions': total_ai_sessions,
            'aiSessionsToday': ai_sessions_today,
            'recentActivities': recent_activities
        })


class AdminUsersView(viewsets.ModelViewSet):
    """Admin user management"""
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def list(self, request):
        """Get all users with statistics"""
        # Get query parameters for filtering
        role_filter = request.query_params.get('role', None)
        search = request.query_params.get('search', None)
        
        users = User.objects.all()
        
        if role_filter:
            users = users.filter(role=role_filter)
        
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Annotated so the two counts below come from this query instead of
        # two more per user — 100 users meant 200 extra round-trips.
        users = users.annotate(
            posts_total=Count('posts', distinct=True),
            comments_total=Count('comments', distinct=True),
        ).order_by('-created_at')[:100]  # Limit to 100 for now
        
        user_data = []
        for user in users:
            user_data.append({
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'program': user.program,
                'year_level': user.year_level,
                'is_active': user.is_active,
                'created_at': user.created_at,
                'last_login': user.last_login,
                'posts_count': user.posts_total,
                'comments_count': user.comments_total,
            })
        
        return Response({
            'count': len(user_data),
            'results': user_data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle user active status"""
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            return Response({
                'status': 'success',
                'is_active': user.is_active
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def update_role(self, request, pk=None):
        """Update user role"""
        try:
            user = User.objects.get(pk=pk)
            new_role = request.data.get('role')

            if new_role not in ['student', 'instructor', 'admin']:
                return Response(
                    {'error': 'Invalid role'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.role = new_role
            # Keep the Django staff flag in lock-step with the admin role so
            # authorization (which now checks is_staff) stays coherent. Never
            # demote an existing superuser's staff flag.
            if not user.is_superuser:
                user.is_staff = (new_role == 'admin')
            user.save(update_fields=['role', 'is_staff'])

            return Response({
                'status': 'success',
                'role': user.role
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class AdminContentView(views.APIView):
    """Admin content moderation"""
    permission_classes = [IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        """Get content for moderation"""
        # Get recent posts
        recent_posts = Post.objects.select_related('author').order_by('-created_at')[:20]
        recent_comments = Comment.objects.select_related('author', 'post').order_by('-created_at')[:20]
        
        posts_data = []
        for post in recent_posts:
            posts_data.append({
                'id': str(post.id),
                'author': post.author.username,
                'content': post.content[:200],  # Truncate content
                'like_count': post.like_count,
                'comment_count': post.comment_count,
                'created_at': post.created_at,
                'is_locked': post.is_locked,
                'is_pinned': post.is_pinned
            })
        
        comments_data = []
        for comment in recent_comments:
            comments_data.append({
                'id': str(comment.id),
                'author': comment.author.username,
                'content': comment.content[:200],
                'post_id': str(comment.post.id),
                'like_count': comment.like_count,
                'created_at': comment.created_at
            })
        
        return Response({
            'posts': posts_data,
            'comments': comments_data,
            'total_posts': Post.objects.count(),
            'total_comments': Comment.objects.count(),
            'locked_posts': Post.objects.filter(is_locked=True).count(),
            'pinned_posts': Post.objects.filter(is_pinned=True).count()
        })
