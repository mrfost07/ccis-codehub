"""
System administration views for managing settings, health monitoring, and logs
"""
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework import status
from django.db import connection
from django.core.cache import cache
from django.utils import timezone
from apps.accounts.models import AppSettings
import logging

logger = logging.getLogger(__name__)


class PasswordVerificationThrottle(UserRateThrottle):
    """Rate limit password verification to 5 attempts per minute"""
    rate = '5/min'


@api_view(['POST'])
@permission_classes([IsAdminUser])
def verify_admin_password(request):
    """
    Verify settings access key for accessing sensitive settings
    
    POST /api/auth/admin/verify-password/
    Body: { "key": "settings_key" }
    Returns: { "valid": true/false }
    """
    import os
    
    submitted_key = request.data.get('key', '').strip()
    correct_key = os.getenv('SYSTEM_SETTINGS_KEY', 'Fostanes_020705')
    
    if not submitted_key:
        return Response(
            {'valid': False, 'error': 'Settings key is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if submitted key matches environment variable
    is_valid = submitted_key == correct_key
    
    if is_valid:
        logger.info(f"Admin {request.user.username} verified settings access")
        return Response({'valid': True})
    else:
        logger.warning(f"Failed settings key verification by {request.user.username}")
        return Response(
            {'valid': False, 'error': 'Invalid settings key'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['PUT'])
@permission_classes([IsAdminUser])
def update_app_settings(request):
    """
    Update application feature flags
    
    PUT /api/settings/
    Body: {
        "enable_user_delete": false,
        "enable_analytics": true,
        ...
    }
    Returns: { "success": true, "features": {...} }
    """
    try:
        settings = AppSettings.get_settings()
        
        # Update feature flags
        if 'enable_user_delete' in request.data:
            settings.enable_user_delete = request.data['enable_user_delete']
        if 'enable_analytics' in request.data:
            settings.enable_analytics = request.data['enable_analytics']
        if 'enable_ai_mentor' in request.data:
            settings.enable_ai_mentor = request.data['enable_ai_mentor']
        if 'enable_code_editor' in request.data:
            settings.enable_code_editor = request.data['enable_code_editor']
        if 'enable_competitions' in request.data:
            settings.enable_competitions = request.data['enable_competitions']
        if 'enable_projects' in request.data:
            settings.enable_projects = request.data['enable_projects']
        if 'enable_community' in request.data:
            settings.enable_community = request.data['enable_community']
        if 'enable_learning_paths' in request.data:
            settings.enable_learning_paths = request.data['enable_learning_paths']
        
        # Track who updated the settings
        settings.updated_by = request.user
        settings.save()
        
        logger.info(f"Admin {request.user.username} updated app settings")
        
        return Response({
            'success': True,
            'features': settings.get_features_dict(request.user),
            'updated_at': settings.updated_at.isoformat(),
            'updated_by': request.user.username
        })
        
    except Exception as e:
        logger.error(f"Error updating app settings: {str(e)}")
        return Response(
            {'success': False, 'error': 'Failed to update settings'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def system_health(request):
    """
    Get system health metrics
    
    GET /api/system/health/
    Returns: {
        "status": "healthy",
        "database": true,
        "cache": true,
        "timestamp": "..."
    }
    """
    # Cache health check for 30 seconds to avoid overhead
    cache_key = 'system_health_check'
    cached_health = cache.get(cache_key)
    
    if cached_health:
        return Response(cached_health)
    
    health_data = {
        'status': 'healthy',
        'database': check_database_connection(),
        'cache': check_cache_connection(),
        'timestamp': timezone.now().isoformat()
    }
    
    # Overall status
    if not health_data['database']:
        health_data['status'] = 'critical'
    elif not health_data['cache']:
        health_data['status'] = 'degraded'
    
    # Cache for 30 seconds
    cache.set(cache_key, health_data, 30)
    
    return Response(health_data)


def check_database_connection():
    """Check if database is accessible"""
    try:
        connection.ensure_connection()
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False


def check_cache_connection():
    """Check if cache is accessible"""
    try:
        cache.set('health_check', 'ok', 10)
        return cache.get('health_check') == 'ok'
    except Exception as e:
        logger.error(f"Cache connection check failed: {str(e)}")
        return False
