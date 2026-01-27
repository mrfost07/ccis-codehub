"""
URL configuration for core project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from apps.core_views import root_view, api_root, health_check, admin_analytics, admin_projects, admin_tasks, get_app_settings

urlpatterns = [
    path('', root_view, name='root'),
    path('api/', api_root, name='api-root'),
    path('api/health/', health_check, name='health-check'),
    path('api/settings/', get_app_settings, name='app-settings'),
    path('api/admin/analytics/', admin_analytics, name='admin-analytics'),
    path('api/admin/projects/', admin_projects, name='admin-projects'),
    path('api/admin/tasks/', admin_tasks, name='admin-tasks'),
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Routes
    path('api/auth/', include('apps.accounts.urls')),
    path('api/users/', include('apps.accounts.urls')),
    path('api/learning/', include('apps.learning.urls')),
    path('api/community/', include('apps.community.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/competitions/', include('apps.competitions.urls')),
    path('api/ai/', include('apps.ai_mentor.urls')),
]


# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
