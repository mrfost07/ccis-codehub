"""
Data Context Service for AI Mentor
Provides database context to AI for accurate, data-aware responses
"""

from typing import Dict, List, Any, Optional
from django.db.models import Q, Count, Avg
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class DataContextService:
    """
    Service for fetching and formatting database context for AI prompts.
    Provides real-time data about courses, projects, users, and posts.
    """
    
    def __init__(self, user=None):
        self.user = user
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get overall system statistics"""
        from apps.learning.models import CareerPath, LearningModule, Enrollment
        from apps.projects.models import Project, Team
        from apps.community.models import Post
        
        return {
            'total_users': User.objects.filter(is_active=True).count(),
            'total_students': User.objects.filter(role='student', is_active=True).count(),
            'total_instructors': User.objects.filter(role='instructor', is_active=True).count(),
            'total_courses': CareerPath.objects.filter(is_active=True).count(),
            'total_modules': LearningModule.objects.count(),  # LearningModule doesn't have is_active
            'total_projects': Project.objects.count(),
            'active_projects': Project.objects.filter(status='in_progress').count(),
            'total_posts': Post.objects.count(),
            'total_enrollments': Enrollment.objects.count(),
        }
    
    def get_all_courses(self) -> List[Dict[str, Any]]:
        """Get all available career paths/courses with details"""
        from apps.learning.models import CareerPath, LearningModule
        
        courses = []
        for path in CareerPath.objects.filter(is_active=True).prefetch_related('modules'):
            module_count = path.modules.count()  # LearningModule doesn't have is_active
            courses.append({
                'id': path.id,
                'name': path.name,
                'slug': path.slug,
                'description': path.description[:200] if path.description else '',
                'difficulty': getattr(path, 'difficulty_level', 'Beginner'),
                'module_count': module_count,
                'icon': path.icon or '📚',
                'enrollment_count': path.enrollments.count() if hasattr(path, 'enrollments') else 0,
            })
        return courses
    
    def get_course_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find a course by exact or partial name match"""
        if not name:
            return None
        
        from apps.learning.models import CareerPath
        
        # Try exact match first
        path = CareerPath.objects.filter(
            Q(name__iexact=name) | Q(slug__iexact=name),
            is_active=True
        ).first()
        
        # Try partial match
        if not path:
            path = CareerPath.objects.filter(
                Q(name__icontains=name) | Q(description__icontains=name),
                is_active=True
            ).first()
        
        if path:
            return {
                'id': path.id,
                'name': path.name,
                'slug': path.slug,
                'description': path.description,
                'difficulty': getattr(path, 'difficulty_level', 'Beginner'),
                'module_count': path.modules.count(),  # LearningModule doesn't have is_active
                'icon': path.icon or '📚',
            }
        return None
    
    def search_courses(self, query: str) -> List[Dict[str, Any]]:
        """Search courses by keyword"""
        if not query:
            return []
        
        from apps.learning.models import CareerPath
        
        paths = CareerPath.objects.filter(
            Q(name__icontains=query) | 
            Q(description__icontains=query) |
            Q(slug__icontains=query),
            is_active=True
        )[:10]
        
        return [{
            'id': p.id,
            'name': p.name,
            'description': p.description[:150] if p.description else '',
            'module_count': p.modules.count(),  # LearningModule doesn't have is_active
        } for p in paths]
    
    def get_all_projects(self, visibility: str = None) -> List[Dict[str, Any]]:
        """Get all projects, optionally filtered"""
        from apps.projects.models import Project
        
        queryset = Project.objects.all()
        
        if visibility is not None:
            queryset = queryset.filter(visibility=visibility)
        
        projects = []
        for p in queryset.select_related('owner')[:20]:
            projects.append({
                'id': str(p.id),
                'name': p.name,
                'slug': p.slug,
                'description': p.description[:150] if p.description else '',
                'status': p.status,
                'project_type': p.project_type,
                'programming_language': p.programming_language,
                'owner': p.owner.username if p.owner else 'Unknown',
                'visibility': p.visibility,
            })
        return projects
    
    def get_project_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find a project by name"""
        if not name:
            return None
        
        from apps.projects.models import Project
        
        project = Project.objects.filter(
            Q(name__icontains=name) | Q(slug__icontains=name)
        ).select_related('owner').first()
        
        if project:
            return {
                'id': str(project.id),
                'name': project.name,
                'slug': project.slug,
                'description': project.description,
                'status': project.status,
                'project_type': project.project_type,
                'programming_language': project.programming_language,
                'owner': project.owner.username if project.owner else 'Unknown',
                'visibility': project.visibility,
            }
        return None
    
    def get_recent_posts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent community posts"""
        from apps.community.models import Post
        
        posts = Post.objects.select_related('author').order_by('-created_at')[:limit]
        
        return [{
            'id': p.id,
            'content': p.content[:100] if p.content else '',
            'author': p.author.username if p.author else 'Unknown',
            'created_at': p.created_at.strftime('%Y-%m-%d %H:%M'),
            'likes_count': p.likes.count() if hasattr(p, 'likes') else 0,
            'comments_count': p.comments.count() if hasattr(p, 'comments') else 0,
        } for p in posts]
    
    def search_users(self, query: str) -> List[Dict[str, Any]]:
        """Search for users by username or name"""
        if not query:
            return []
        
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query),
            is_active=True
        )[:10]
        
        return [{
            'id': u.id,
            'username': u.username,
            'full_name': f"{u.first_name} {u.last_name}".strip() or u.username,
            'role': u.role if hasattr(u, 'role') else 'student',
            'email': u.email,
        } for u in users]
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user details by username"""
        if not username:
            return None
        
        username = username.strip('@')
        user = User.objects.filter(
            Q(username__iexact=username) | Q(username__icontains=username),
            is_active=True
        ).first()
        
        if user:
            return {
                'id': user.id,
                'username': user.username,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'role': user.role if hasattr(user, 'role') else 'student',
                'program': getattr(user, 'program', None),
                'year_level': getattr(user, 'year_level', None),
            }
        return None
    
    def get_user_context(self) -> Dict[str, Any]:
        """Get context about the current user"""
        if not self.user:
            return {}
        
        from apps.learning.models import Enrollment
        from apps.projects.models import Project
        from apps.community.models import Post
        
        enrollments = Enrollment.objects.filter(user=self.user).select_related('career_path')
        owned_projects = Project.objects.filter(owner=self.user)
        user_posts = Post.objects.filter(author=self.user)
        
        return {
            'username': self.user.username,
            'full_name': f"{self.user.first_name} {self.user.last_name}".strip(),
            'role': getattr(self.user, 'role', 'student'),
            'enrolled_courses': [{
                'id': e.career_path.id,
                'name': e.career_path.name,
                'progress': getattr(e, 'progress_percentage', 0),
            } for e in enrollments],
            'owned_projects_count': owned_projects.count(),
            'posts_count': user_posts.count(),
            'followers_count': self.user.followers.count() if hasattr(self.user, 'followers') else 0,
            'following_count': self.user.following.count() if hasattr(self.user, 'following') else 0,
        }
    
    def build_context_string(self, include_stats: bool = True, 
                             include_courses: bool = True,
                             include_user: bool = True) -> str:
        """
        Build a formatted context string for AI prompts.
        This is the main method to inject into AI responses.
        """
        context_parts = []
        
        # System stats
        if include_stats:
            stats = self.get_system_stats()
            context_parts.append(f"""
PLATFORM STATISTICS:
- Total Users: {stats['total_users']} ({stats['total_students']} students, {stats['total_instructors']} instructors)
- Career Paths/Courses: {stats['total_courses']} with {stats['total_modules']} modules
- Projects: {stats['total_projects']} total ({stats['active_projects']} active)
- Community Posts: {stats['total_posts']}
- Total Enrollments: {stats['total_enrollments']}
""")
        
        # Available courses
        if include_courses:
            courses = self.get_all_courses()
            if courses:
                course_list = "\n".join([
                    f"  - {c['name']} (ID:{c['id']}, {c['module_count']} modules, {c['enrollment_count']} enrolled)"
                    for c in courses
                ])
                context_parts.append(f"""
AVAILABLE COURSES:
{course_list}
""")
        
        # User context
        if include_user and self.user:
            user_ctx = self.get_user_context()
            enrolled = ", ".join([c['name'] for c in user_ctx.get('enrolled_courses', [])]) or "None"
            context_parts.append(f"""
CURRENT USER: {user_ctx['full_name']} (@{user_ctx['username']})
- Role: {user_ctx['role']}
- Enrolled In: {enrolled}
- Projects: {user_ctx['owned_projects_count']}
- Posts: {user_ctx['posts_count']}
- Followers: {user_ctx['followers_count']} | Following: {user_ctx['following_count']}
""")
        
        return "\n".join(context_parts)
    
    def get_context_for_query(self, query: str) -> Dict[str, Any]:
        """
        Analyze query and fetch relevant context data.
        Returns structured data that can be used in AI prompts.
        """
        query_lower = query.lower()
        context = {
            'type': 'general',
            'data': {},
            'suggestions': []
        }
        
        # Course-related queries
        if any(kw in query_lower for kw in ['course', 'path', 'learn', 'enroll', 'module']):
            context['type'] = 'courses'
            
            # Try to find specific course mentioned
            courses = self.get_all_courses()
            for course in courses:
                if course['name'].lower() in query_lower:
                    context['data']['matched_course'] = course
                    break
            
            context['data']['all_courses'] = courses
            context['suggestions'] = [c['name'] for c in courses[:5]]
        
        # Project-related queries
        elif any(kw in query_lower for kw in ['project', 'contribute', 'team', 'build']):
            context['type'] = 'projects'
            
            if 'contribute' in query_lower or 'join' in query_lower:
                context['data']['open_projects'] = self.get_all_projects(visibility='public')
            else:
                context['data']['all_projects'] = self.get_all_projects()
        
        # User-related queries
        elif any(kw in query_lower for kw in ['user', 'who', 'profile', '@', 'follow']):
            context['type'] = 'users'
            
            # Extract username if mentioned
            import re
            match = re.search(r'@(\w+)', query)
            if match:
                username = match.group(1)
                context['data']['matched_user'] = self.get_user_by_username(username)
        
        # Statistics queries
        elif any(kw in query_lower for kw in ['how many', 'total', 'count', 'statistics', 'stats']):
            context['type'] = 'stats'
            context['data']['stats'] = self.get_system_stats()
        
        # Post-related queries
        elif any(kw in query_lower for kw in ['post', 'community', 'recent', 'news']):
            context['type'] = 'posts'
            context['data']['recent_posts'] = self.get_recent_posts()
        
        return context
