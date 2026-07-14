"""
URL configuration for accounts app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserRegistrationView, UserLoginView, UserProfileView,
    UserViewSet, UserStatsAPIView, PublicUserProfileView, PublicStatsView,
    GoogleOAuthCallbackView, CreateGoogleAccountView,
    CaptchaChallengeView
)
from .admin_views import AdminDashboardView, AdminUsersView, AdminContentView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'users', AdminUsersView, basename='admin-users')

urlpatterns = [
    # Auth endpoints
    path('captcha/', CaptchaChallengeView.as_view(), name='captcha-challenge'),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    # JWT refresh — lets the client swap a valid refresh token for a fresh
    # access token instead of forcing a logout every 15 minutes. With rotation
    # enabled, the response also returns a new refresh token. (Req 20.)
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('stats/', UserStatsAPIView.as_view(), name='user-stats'),
    path('public-stats/', PublicStatsView.as_view(), name='public-stats'),
    
    # Public user profile
    path('user/<uuid:user_id>/', PublicUserProfileView.as_view(), name='public-user-profile'),
    
    # Admin endpoints
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/content/', AdminContentView.as_view(), name='admin-content'),
    path('admin/', include(admin_router.urls)),
    
    # Google OAuth endpoints
    path('google/callback/', GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),
    path('google/create-account/', CreateGoogleAccountView.as_view(), name='create-google-account'),
    
    path('', include(router.urls)),
]
