"""
URL configuration for accounts app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserRegistrationView, UserLoginView, UserProfileView,
    UserViewSet, UserStatsAPIView, PublicUserProfileView, PublicStatsView,
    GoogleOAuthCallbackView, CompleteGoogleProfileView
)
from .admin_views import AdminDashboardView, AdminUsersView, AdminContentView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'users', AdminUsersView, basename='admin-users')

urlpatterns = [
    # Auth endpoints
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
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
    path('google/complete-profile/', CompleteGoogleProfileView.as_view(), name='complete-google-profile'),
    
    path('', include(router.urls)),
]

