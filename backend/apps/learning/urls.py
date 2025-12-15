"""
URL configuration for learning app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CareerPathViewSet, LearningModuleViewSet, QuizViewSet,
    UserProgressViewSet, CertificateViewSet, EnrollmentViewSet,
    ModuleProgressViewSet, PDFExtractorView
)
from .admin_views import (
    AdminLearningModuleViewSet, AdminCareerPathViewSet, LearningProgressView
)

router = DefaultRouter()
router.register(r'career-paths', CareerPathViewSet, basename='career-path')
router.register(r'modules', LearningModuleViewSet, basename='learning-module')
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'progress', UserProgressViewSet, basename='user-progress')
router.register(r'certificates', CertificateViewSet, basename='certificate')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')
router.register(r'module-progress', ModuleProgressViewSet, basename='module-progress')
router.register(r'pdf-extractor', PDFExtractorView, basename='pdf-extractor')

# Admin routes
admin_router = DefaultRouter()
admin_router.register(r'modules', AdminLearningModuleViewSet, basename='admin-module')
admin_router.register(r'career-paths', AdminCareerPathViewSet, basename='admin-career-path')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
    path('my-progress/', LearningProgressView.as_view(), name='my-progress'),
]

