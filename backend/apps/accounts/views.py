"""
Views for accounts app with enhanced user management
"""
from rest_framework import status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import User, UserProfile
from .serializers import (
    UserSerializer, UserProfileSerializer,
    UserRegistrationSerializer, UserLoginSerializer
)


class UserRegistrationView(APIView):
    """User registration endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Check email domain restriction
        email = request.data.get('email', '')
        ALLOWED_DOMAINS = ['ssct.edu.ph', 'snsu.edu.ph']
        email_domain = email.split('@')[-1].lower() if '@' in email else ''
        
        if email_domain not in ALLOWED_DOMAINS:
            return Response(
                {'error': 'Only institutional emails (@ssct.edu.ph, @snsu.edu.ph) are allowed to register. Please use your school email.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Create user profile
            UserProfile.objects.create(user=user)
            
            # Don't auto-login after registration - user must login first
            return Response({
                'user': UserSerializer(user).data,
                'message': 'Registration successful! Please login to continue.'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """User login endpoint"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            user = authenticate(email=email, password=password)
            
            if user:
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'user': UserSerializer(user).data,
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                }, status=status.HTTP_200_OK)
            
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """User profile endpoint"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def put(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        user = request.user
        logger.info(f"Profile update request for user: {user.username}")
        logger.info(f"Request data: {request.data}")

        # Normalize incoming data for both JSON and multipart
        if isinstance(request.data, dict):
            data = request.data.copy()
        else:
            # For multipart data
            data = request.data.dict() if hasattr(request.data, 'dict') else {}

        # Parse array-like JSON fields if sent as strings in multipart
        for key in ['skills', 'career_interests']:
            if key in data and isinstance(data[key], str):
                try:
                    import json
                    data[key] = json.loads(data[key])
                except Exception:
                    # If parsing fails, fallback to comma-separated list
                    if isinstance(data[key], str) and ',' in data[key]:
                        data[key] = [s.strip() for s in data[key].split(',') if s.strip()]

        # Handle profile picture file uploads
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']

        # Split fields between User and UserProfile correctly
        user_fields = [
            'first_name', 'last_name', 'bio', 'skills', 'career_interests',
            'program', 'year_level', 'username', 'email'
        ]
        profile_fields = [
            'github_username', 'linkedin_url', 'website_url', 'location',
            'theme_preference', 'profile_background'
        ]

        # Prepare partial updates for user (only user model fields)
        user_update = {k: v for k, v in data.items() if k in user_fields}

        # Only validate and save if there are user fields to update
        if user_update:
            logger.info(f"User update data: {user_update}")
            serializer = UserSerializer(user, data=user_update, partial=True)
            if not serializer.is_valid():
                logger.error(f"Serializer errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            logger.info("User data saved successfully")

        # Apply profile updates safely
        if hasattr(user, 'profile'):
            profile = user.profile
            updated = False
            for field in profile_fields:
                if field in data:
                    setattr(profile, field, data[field])
                    updated = True
            if updated:
                profile.save()
        else:
            # Create profile if it doesn't exist
            from .models import UserProfile
            profile_data = {field: data[field] for field in profile_fields if field in data}
            if profile_data:
                UserProfile.objects.create(user=user, **profile_data)

        # Save user if picture updated
        if 'profile_picture' in request.FILES:
            user.save()

        # Refresh and return updated data
        user.refresh_from_db()
        return Response(UserSerializer(user).data)


class PublicUserProfileView(APIView):
    """
    View another user's public profile.
    
    Security: Uses PublicUserSerializer (no email) when viewing OTHER users.
    UserSerializer (with email) only used when viewing OWN profile.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        from .serializers import PublicUserSerializer
        
        try:
            user = User.objects.get(id=user_id)
            is_own_profile = str(user.id) == str(request.user.id)
            
            # Get follow status
            from apps.community.models import UserFollow
            follow_status = None
            is_following = False
            is_pending = False
            is_follower = False
            
            try:
                follow = UserFollow.objects.get(follower=request.user, following=user)
                follow_status = follow.status
                is_following = follow.status == 'accepted'
                is_pending = follow.status == 'pending'
            except UserFollow.DoesNotExist:
                pass
            
            # Check if they follow the current user
            is_follower = UserFollow.objects.filter(
                follower=user, 
                following=request.user,
                status='accepted'
            ).exists()
            
            # Get counts
            followers_count = UserFollow.objects.filter(following=user, status='accepted').count()
            following_count = UserFollow.objects.filter(follower=user, status='accepted').count()
            
            # Use appropriate serializer based on whether viewing own profile
            # Security: Only expose email/sensitive data for own profile or admin
            if is_own_profile or request.user.is_staff:
                serializer = UserSerializer(user)
            else:
                serializer = PublicUserSerializer(user)
            
            data = serializer.data
            data['is_following'] = is_following
            data['is_pending'] = is_pending
            data['is_follower'] = is_follower
            data['follow_status'] = follow_status
            data['followers_count'] = followers_count
            data['following_count'] = following_count
            data['is_own_profile'] = is_own_profile
            
            return Response(data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.
    
    Security: Uses PublicUserSerializer for list/retrieve to prevent IDOR.
    Full data (including email) only visible to owner or admin.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action and user permissions.
        - list: PublicUserSerializer (limited fields, no email) for regular users
                UserSerializer (full fields) for admin
        - retrieve: PublicUserSerializer if viewing OTHER user
                   UserSerializer if viewing SELF or admin
        """
        from .serializers import PublicUserSerializer
        
        # Admin gets full access to all data
        if self.request.user.is_staff:
            return UserSerializer
        
        # For list action, regular users get limited public data
        if self.action == 'list':
            return PublicUserSerializer
        
        # For retrieve action, check if viewing own profile
        if self.action == 'retrieve':
            # Get the user being viewed
            try:
                obj = self.get_object()
                if obj.id == self.request.user.id:
                    return UserSerializer  # Own profile - full data
            except:
                pass
            return PublicUserSerializer  # Other user - limited data
        
        return UserSerializer
    
    def get_permissions(self):
        """Allow different permissions for different actions"""
        if self.action in ['create']:
            return [AllowAny()]
        elif self.action in ['destroy', 'update', 'partial_update']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for users/coders by username, name, or email"""
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])
        
        from django.db.models import Q
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(id=request.user.id)[:20]
        
        results = []
        for user in users:
            results.append({
                'id': str(user.id),
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'profile_picture': user.profile_picture.url if user.profile_picture else None,
                'program': user.program,
                'role': user.role
            })
        
        return Response(results)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics for admin dashboard"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        stats = {
            'total': User.objects.count(),
            'students': User.objects.filter(role='student').count(),
            'instructors': User.objects.filter(role='instructor').count(),
            'admins': User.objects.filter(role='admin').count(),
            'active': User.objects.filter(is_active=True).count(),
            'recent': User.objects.order_by('-created_at')[:5].values(
                'id', 'email', 'username', 'role', 'created_at'
            )
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def change_role(self, request, pk=None):
        """Change user role (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        new_role = request.data.get('role')
        
        if new_role not in ['student', 'instructor', 'admin']:
            return Response(
                {'error': 'Invalid role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.role = new_role
        if new_role == 'admin':
            user.is_staff = True
            user.is_superuser = True
        elif new_role == 'instructor':
            user.is_staff = True
            user.is_superuser = False
        else:
            user.is_staff = False
            user.is_superuser = False
        
        user.save()
        
        return Response({
            'message': f'User role changed to {new_role}',
            'user': UserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle user active/inactive status (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Prevent admin from deactivating themselves
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot deactivate your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Toggle the status
        user.is_active = not user.is_active
        user.save()
        
        status_text = 'activated' if user.is_active else 'deactivated'
        return Response({
            'message': f'User {status_text} successfully',
            'user': UserSerializer(user).data
        })
    
    @action(detail=False, methods=['get'])
    def instructors(self, request):
        """Get list of all instructors"""
        instructors = User.objects.filter(role='instructor')
        serializer = UserSerializer(instructors, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def students(self, request):
        """Get list of all students"""
        students = User.objects.filter(role='student')
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def learning_progress(self, request, pk=None):
        """Get user's learning progress"""
        user = self.get_object()
        
        # Import here to avoid circular imports
        from apps.learning.models import UserProgress, UserCertificate
        
        progress = UserProgress.objects.filter(user=user)
        certificates = UserCertificate.objects.filter(user=user)
        
        return Response({
            'enrolled_paths': progress.count(),
            'completed_modules': progress.filter(
                completed_modules__isnull=False
            ).values_list('completed_modules', flat=True),
            'certificates': certificates.count(),
            'total_points': sum(p.total_points for p in progress)
        })


class UserStatsAPIView(APIView):
    """API endpoint for user statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's statistics"""
        user = request.user
        
        # Import here to avoid circular imports
        from apps.learning.models import UserProgress, UserCertificate
        from apps.projects.models import Project, ProjectMembership
        from apps.community.models import Post, Comment
        
        # Learning stats
        user_progress = UserProgress.objects.filter(user=user)
        certificates = UserCertificate.objects.filter(user=user)
        
        # Project stats
        owned_projects = Project.objects.filter(owner=user)
        member_projects = ProjectMembership.objects.filter(user=user, is_active=True)
        
        # Community stats
        posts = Post.objects.filter(author=user)
        comments = Comment.objects.filter(author=user)
        
        stats = {
            'learning': {
                'enrolled_courses': user_progress.count(),
                'completed_courses': user_progress.filter(progress=100).count(),
                'certificates': certificates.count(),
                'total_points': sum(p.total_points for p in user_progress)
            },
            'projects': {
                'owned': owned_projects.count(),
                'member_of': member_projects.count(),
                'completed': owned_projects.filter(status='completed').count()
            },
            'community': {
                'posts': posts.count(),
                'comments': comments.count(),
                'likes_received': sum(p.likes.count() for p in posts)
            },
            'profile': {
                'role': user.role,
                'member_since': user.created_at.isoformat() if user.created_at else None,
                'is_verified': user.is_active
            }
        }
        
        return Response(stats)


class PublicStatsView(APIView):
    """Public statistics for homepage - no authentication required"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        from apps.learning.models import CareerPath, LearningModule, Enrollment
        from apps.projects.models import Project, Team
        from apps.community.models import Post
        
        # Get actual counts - count ALL records, not just active ones
        stats = {
            'total_users': User.objects.count(),  # Count all users
            'total_courses': CareerPath.objects.count(),  # Count all career paths
            'total_projects': Project.objects.count(),
            'total_teams': Team.objects.count(),
            'total_posts': Post.objects.count(),
            'total_enrollments': Enrollment.objects.count(),
            'total_modules': LearningModule.objects.count(),
        }
        
        return Response(stats)


class GoogleOAuthCallbackView(APIView):
    """
    Handle Google OAuth callback - direct Google OAuth
    Supports mode='login' or mode='signup'
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')
        mode = request.data.get('mode', 'login')  # 'login' or 'signup'
        
        if not code:
            return Response(
                {'error': 'Authorization code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import requests
            import os
            
            # Get client secret from environment
            client_id = os.environ.get('GOOGLE_CLIENT_ID', '1018587300192-m0n93uesm6v33bahs57tatg52v3lurah.apps.googleusercontent.com')
            client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
            
            if not client_secret:
                return Response(
                    {'error': 'Google OAuth not configured on server'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Exchange code for tokens with Google
            token_response = requests.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'grant_type': 'authorization_code',
                    'code': code,
                    'redirect_uri': redirect_uri,
                    'client_id': client_id,
                    'client_secret': client_secret,
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if not token_response.ok:
                print(f"Google token error: {token_response.text}")
                return Response(
                    {'error': 'Failed to exchange authorization code with Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token_data = token_response.json()
            
            # Get user info from Google
            userinfo_response = requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f"Bearer {token_data.get('access_token')}"}
            )
            
            if not userinfo_response.ok:
                return Response(
                    {'error': 'Failed to get user info from Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            google_user = userinfo_response.json()
            email = google_user.get('email')
            
            if not email:
                return Response(
                    {'error': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Allowed email domains for Google sign-in
            ALLOWED_DOMAINS = ['ssct.edu.ph', 'snsu.edu.ph']
            email_domain = email.split('@')[-1].lower()
            
            # Check if user exists
            user = User.objects.filter(email=email).first()
            
            # ========== LOGIN MODE ==========
            if mode == 'login':
                if user:
                    # Existing user - log them in
                    refresh = RefreshToken.for_user(user)
                    return Response({
                        'user': UserSerializer(user).data,
                        'tokens': {
                            'access': str(refresh.access_token),
                            'refresh': str(refresh),
                        },
                        'is_existing_user': True,
                    })
                else:
                    # New user trying to login - tell them to signup
                    return Response({
                        'error': 'No account found with this email. Please sign up first.',
                        'is_new_user': True,
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # ========== SIGNUP MODE ==========
            elif mode == 'signup':
                if user:
                    # Existing user trying to sign up - warn them
                    return Response({
                        'is_existing_user': True,
                        'email': email,
                        'message': 'An account with this email already exists. Please login instead.',
                    })
                else:
                    # New user - check email domain
                    if email_domain not in ALLOWED_DOMAINS:
                        return Response({
                            'error': f'Only institutional emails (@ssct.edu.ph, @snsu.edu.ph) are allowed to sign up.',
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    # Return Google data for profile completion (don't create user yet)
                    return Response({
                        'is_new_user': True,
                        'google_data': {
                            'email': email,
                            'first_name': google_user.get('given_name', ''),
                            'last_name': google_user.get('family_name', ''),
                            'google_id': google_user.get('id') or google_user.get('sub'),  # v2 API uses 'id', OIDC uses 'sub'
                            'picture': google_user.get('picture', ''),
                        }
                    })
            else:
                return Response(
                    {'error': 'Invalid mode. Use "login" or "signup".'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CreateGoogleAccountView(APIView):
    """
    Create a new account after Google OAuth signup + profile completion wizard
    Called after user fills out the profile form with program/year_level
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        google_data = request.data.get('google_data', {})
        profile_data = request.data.get('profile_data', {})
        
        # Debug logging
        print(f"CreateGoogleAccountView - google_data: {google_data}")
        print(f"CreateGoogleAccountView - profile_data: {profile_data}")
        
        email = google_data.get('email')
        google_id = google_data.get('google_id')
        
        if not email:
            return Response(
                {'error': 'Email is required in google_data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Google ID is optional - if not provided, generate from email hash
        # This handles stale OAuth data that may not have the ID
        if not google_id:
            import hashlib
            google_id = f"google_{hashlib.md5(email.encode()).hexdigest()[:16]}"
            print(f"Generated google_id from email hash: {google_id}")
        
        # Validate required profile fields
        program = profile_data.get('program')
        year_level = profile_data.get('year_level')
        
        if not program or not year_level:
            return Response(
                {'error': f'Program and year level are required. Received: program={program}, year_level={year_level}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check if user already exists (race condition protection)
            if User.objects.filter(email=email).exists():
                return Response(
                    {'error': 'An account with this email already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate unique username
            username = profile_data.get('username') or email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Create user
            user = User.objects.create(
                email=email,
                username=username,
                first_name=google_data.get('first_name', ''),
                last_name=google_data.get('last_name', ''),
                is_active=True,
                google_id=google_id,
                program=program,
                year_level=year_level,
            )
            user.set_unusable_password()
            user.save()
            
            # Create profile with additional data
            profile, _ = UserProfile.objects.get_or_create(user=user)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'message': 'Account created successfully!'
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


