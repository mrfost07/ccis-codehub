"""
URL configuration for ai_mentor app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIMentorProfileViewSet, ProjectMentorSessionViewSet,
    CodeAnalysisViewSet, LearningRecommendationViewSet,
    AIModelConfigView
)
from .views_settings import (
    AIModelConfigViewSet,
    UserAISettingsViewSet,
    CustomAIModelViewSet,
)

router = DefaultRouter()
router.register(r'profile', AIMentorProfileViewSet, basename='ai-profile')
router.register(r'sessions', ProjectMentorSessionViewSet, basename='ai-session')
router.register(r'code-analysis', CodeAnalysisViewSet, basename='code-analysis')
router.register(r'recommendations', LearningRecommendationViewSet, basename='recommendation')
router.register(r'models', AIModelConfigViewSet, basename='ai-models')
router.register(r'settings', UserAISettingsViewSet, basename='ai-settings')
router.register(r'custom-models', CustomAIModelViewSet, basename='ai-custom-models')

urlpatterns = [
    path('', include(router.urls)),
]

