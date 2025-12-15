"""
AI Action Execution Service
Performs actions on behalf of users (search, enroll, create, etc.)
"""

from typing import Dict, List, Any
from django.db.models import Q, Count
from django.contrib.auth import get_user_model

User = get_user_model()


class ActionService:
    """Service for executing AI-requested actions"""
    
    def __init__(self, user):
        self.user = user
    
    def search_courses(self, query: str) -> Dict[str, Any]:
        """Search for courses in Learning Center"""
        from apps.learning.models import CareerPath, LearningModule
        
        # Search in career paths
        paths = CareerPath.objects.filter(
            Q(name__icontains=query) | 
            Q(description__icontains=query)
        ).annotate(
            module_count=Count('modules')
        )[:5]
        
        # Search in modules
        modules = LearningModule.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query)
        ).select_related('career_path')[:5]
        
        return {
            'success': True,
            'query': query,
            'paths': [self._serialize_path(p) for p in paths],
            'modules': [self._serialize_module(m) for m in modules],
            'total': paths.count() + modules.count()
        }
    
    def enroll_in_path(self, path_id: int) -> Dict[str, Any]:
        """Enroll user in a career path"""
        from apps.learning.models import CareerPath, UserProgress
        
        try:
            path = CareerPath.objects.get(id=path_id)
            
            # Check if already enrolled
            existing = UserProgress.objects.filter(user=self.user, path=path).first()
            if existing:
                return {
                    'success': False,
                    'message': f'You are already enrolled in {path.name}',
                    'already_enrolled': True
                }
            
            # Create enrollment
            progress = UserProgress.objects.create(
                user=self.user,
                path=path,
                status='in_progress',
                completed_modules=0
            )
            
            return {
                'success': True,
                'message': f'Successfully enrolled in {path.name}!',
                'path': self._serialize_path(path),
                'progress': self._serialize_progress(progress)
            }
            
        except CareerPath.DoesNotExist:
            return {
                'success': False,
                'message': 'Course not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error enrolling: {str(e)}'
            }
    
    def create_project(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project"""
        from apps.projects.models import Project
        
        try:
            project = Project.objects.create(
                owner=self.user,
                name=data.get('name', data.get('title', 'New Project')),
                description=data.get('description', ''),
                project_type=data.get('project_type', 'web_application'),
                programming_language=data.get('programming_language', 'python'),
                status=data.get('status', 'planning'),
                visibility=data.get('visibility', 'private')
            )
            
            return {
                'success': True,
                'message': f"Project '{project.name}' created successfully!",
                'project': self._serialize_project(project)
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Error creating project: {str(e)}'
            }
    
    def create_community_post(self, content: str, hashtags: List[str] = None) -> Dict[str, Any]:
        """Create a community post"""
        from apps.community.models import Post, Hashtag
        
        try:
            post = Post.objects.create(
                user=self.user,
                content=content
            )
            
            # Add hashtags if provided
            if hashtags:
                for tag_name in hashtags:
                    # Clean tag name
                    clean_tag = tag_name.strip('#').strip().lower()
                    if clean_tag:
                        tag, _ = Hashtag.objects.get_or_create(name=clean_tag)
                        post.hashtags.add(tag)
            
            return {
                'success': True,
                'message': 'Post published successfully!',
                'post': self._serialize_post(post)
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Error creating post: {str(e)}'
            }
    
    def search_projects(self, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Search for projects"""
        from apps.projects.models import Project
        
        projects = Project.objects.all()
        
        if filters:
            if filters.get('visibility'):
                projects = projects.filter(visibility=filters['visibility'])
            
            if filters.get('programming_language'):
                projects = projects.filter(programming_language__icontains=filters['programming_language'])
            
            if filters.get('status'):
                projects = projects.filter(status=filters['status'])
            
            if filters.get('query'):
                projects = projects.filter(
                    Q(name__icontains=filters['query']) |
                    Q(description__icontains=filters['query'])
                )
        
        projects = projects.select_related('owner')[:10]
        
        return {
            'success': True,
            'projects': [self._serialize_project(p) for p in projects],
            'total': projects.count()
        }
    
    def request_to_join_project(self, project_id: int, message: str = None) -> Dict[str, Any]:
        """Send request to join a project"""
        from apps.projects.models import Project, ProjectMember
        
        try:
            project = Project.objects.get(id=project_id)
            
            # Check if already a member
            if ProjectMember.objects.filter(project=project, user=self.user).exists():
                return {
                    'success': False,
                    'message': 'You are already a member of this project'
                }
            
            # Create join request (or add as pending member)
            member = ProjectMember.objects.create(
                project=project,
                user=self.user,
                role='contributor',
                status='pending'
            )
            
            # TODO: Send notification to project owner
            
            return {
                'success': True,
                'message': f'Join request sent for {project.title}!',
                'project': self._serialize_project(project)
            }
            
        except Project.DoesNotExist:
            return {
                'success': False,
                'message': 'Project not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error sending request: {str(e)}'
            }
    
    # Serializer methods
    
    def _serialize_path(self, path) -> Dict:
        """Serialize career path"""
        module_count = path.modules.count() if hasattr(path, 'modules') else path.module_count if hasattr(path, 'module_count') else 0
        
        return {
            'id': path.id,
            'name': path.name,
            'description': path.description,
            'icon': path.icon,
            'module_count': module_count,
            'created_at': path.created_at.isoformat() if hasattr(path, 'created_at') else None
        }
    
    def _serialize_module(self, module) -> Dict:
        """Serialize learning module"""
        return {
            'id': module.id,
            'title': module.title,
            'description': module.description,
            'path_name': module.career_path.name if hasattr(module, 'career_path') and module.career_path else None,
            'order': module.order
        }
    
    def _serialize_progress(self, progress) -> Dict:
        """Serialize user progress"""
        return {
            'id': progress.id,
            'path_name': progress.path.name,
            'status': progress.status,
            'completed_modules': progress.completed_modules
        }
    
    def _serialize_project(self, project) -> Dict:
        """Serialize project"""
        return {
            'id': str(project.id),
            'name': project.name,
            'description': project.description,
            'project_type': project.project_type,
            'programming_language': project.programming_language,
            'status': project.status,
            'owner': {
                'id': str(project.owner.id),
                'username': project.owner.username,
                'full_name': f"{project.owner.first_name} {project.owner.last_name}".strip() or project.owner.username
            },
            'visibility': project.visibility,
            'created_at': project.created_at.isoformat()
        }
    
    def _serialize_post(self, post) -> Dict:
        """Serialize community post"""
        return {
            'id': post.id,
            'content': post.content,
            'user': {
                'id': post.user.id,
                'username': post.user.username
            },
            'likes_count': post.likes.count() if hasattr(post, 'likes') else 0,
            'comments_count': post.comments.count() if hasattr(post, 'comments') else 0,
            'created_at': post.created_at.isoformat()
        }
    
    # New action methods
    
    def get_user_progress(self) -> Dict[str, Any]:
        """Get user's enrolled courses and progress"""
        from apps.learning.models import UserProgress
        
        progress = UserProgress.objects.filter(user=self.user).select_related('path')
        
        return {
            'success': True,
            'enrolled_courses': [
                {
                    'id': p.path.id,
                    'name': p.path.name,
                    'description': p.path.description,
                    'progress': p.progress if hasattr(p, 'progress') else 0,
                    'completed_modules': p.completed_modules,
                    'status': p.status,
                    'started_at': p.created_at.isoformat() if hasattr(p, 'created_at') else None
                }
                for p in progress
            ],
            'total': progress.count()
        }
    
    def get_user_projects(self) -> Dict[str, Any]:
        """Get user's projects (owned and member of)"""
        from apps.projects.models import Project, ProjectMembership
        
        # Projects owned by user
        owned = Project.objects.filter(owner=self.user)
        
        # Projects user is a member of
        memberships = ProjectMembership.objects.filter(
            user=self.user, 
            is_active=True
        ).select_related('project')
        
        return {
            'success': True,
            'owned_projects': [self._serialize_project(p) for p in owned],
            'member_projects': [
                self._serialize_project(m.project) for m in memberships
            ],
            'total': owned.count() + memberships.count()
        }
    
    def unenroll_from_path(self, path_id: int) -> Dict[str, Any]:
        """Unenroll user from a career path"""
        from apps.learning.models import CareerPath, UserProgress
        
        try:
            path = CareerPath.objects.get(id=path_id)
            progress = UserProgress.objects.filter(user=self.user, path=path).first()
            
            if not progress:
                return {
                    'success': False,
                    'message': f'You are not enrolled in {path.name}'
                }
            
            progress.delete()
            
            return {
                'success': True,
                'message': f'Successfully unenrolled from {path.name}',
                'path_name': path.name
            }
            
        except CareerPath.DoesNotExist:
            return {
                'success': False,
                'message': 'Course not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error unenrolling: {str(e)}'
            }
    
    def follow_user(self, username: str) -> Dict[str, Any]:
        """Follow a user"""
        from apps.community.models import UserFollow
        
        try:
            target_user = User.objects.get(username=username)
            
            if target_user == self.user:
                return {
                    'success': False,
                    'message': "You can't follow yourself"
                }
            
            # Check if already following
            existing = UserFollow.objects.filter(
                follower=self.user, 
                following=target_user
            ).first()
            
            if existing:
                return {
                    'success': False,
                    'message': f'You are already following @{username}',
                    'status': existing.status
                }
            
            # Create follow
            follow = UserFollow.objects.create(
                follower=self.user,
                following=target_user,
                status='pending'  # or 'accepted' based on privacy settings
            )
            
            return {
                'success': True,
                'message': f'Follow request sent to @{username}!',
                'user': {
                    'id': str(target_user.id),
                    'username': target_user.username,
                    'full_name': f"{target_user.first_name} {target_user.last_name}".strip()
                }
            }
            
        except User.DoesNotExist:
            return {
                'success': False,
                'message': f'User @{username} not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error following user: {str(e)}'
            }
    
    def unfollow_user(self, username: str) -> Dict[str, Any]:
        """Unfollow a user"""
        from apps.community.models import UserFollow
        
        try:
            target_user = User.objects.get(username=username)
            
            follow = UserFollow.objects.filter(
                follower=self.user, 
                following=target_user
            ).first()
            
            if not follow:
                return {
                    'success': False,
                    'message': f'You are not following @{username}'
                }
            
            follow.delete()
            
            return {
                'success': True,
                'message': f'Unfollowed @{username}',
                'username': username
            }
            
        except User.DoesNotExist:
            return {
                'success': False,
                'message': f'User @{username} not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error unfollowing user: {str(e)}'
            }
    
    def search_users(self, query: str) -> Dict[str, Any]:
        """Search for users"""
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=self.user.id)[:10]
        
        return {
            'success': True,
            'users': [
                {
                    'id': str(u.id),
                    'username': u.username,
                    'full_name': f"{u.first_name} {u.last_name}".strip() or u.username,
                    'profile_picture': u.profile_picture.url if u.profile_picture else None
                }
                for u in users
            ],
            'total': users.count()
        }
    
    def like_post(self, post_id: int) -> Dict[str, Any]:
        """Like a community post"""
        from apps.community.models import Post
        
        try:
            post = Post.objects.get(id=post_id)
            
            # Check if already liked
            if post.likes.filter(id=self.user.id).exists():
                return {
                    'success': False,
                    'message': 'You already liked this post'
                }
            
            post.likes.add(self.user)
            
            return {
                'success': True,
                'message': 'Post liked!',
                'post_id': post_id,
                'likes_count': post.likes.count()
            }
            
        except Post.DoesNotExist:
            return {
                'success': False,
                'message': 'Post not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error liking post: {str(e)}'
            }
    
    def comment_on_post(self, post_id: int, content: str) -> Dict[str, Any]:
        """Add a comment to a post"""
        from apps.community.models import Post, Comment
        
        try:
            post = Post.objects.get(id=post_id)
            
            comment = Comment.objects.create(
                post=post,
                author=self.user,
                content=content
            )
            
            return {
                'success': True,
                'message': 'Comment added!',
                'comment': {
                    'id': comment.id,
                    'content': comment.content,
                    'author': self.user.username,
                    'created_at': comment.created_at.isoformat()
                }
            }
            
        except Post.DoesNotExist:
            return {
                'success': False,
                'message': 'Post not found'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error commenting: {str(e)}'
            }
