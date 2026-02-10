"""
Learning app URL configuration with live quiz endpoints
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, views_live_quiz, admin_views

router = DefaultRouter()
# Public/Student Routes
router.register(r'career-paths', views.CareerPathViewSet, basename='career-path')
router.register(r'modules', views.LearningModuleViewSet, basename='module')
router.register(r'quizzes', views.QuizViewSet, basename='quiz')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'progress', views.UserProgressViewSet, basename='progress')
router.register(r'certificates', views.CertificateViewSet, basename='certificate')
router.register(r'module-progress', views.ModuleProgressViewSet, basename='module-progress')
router.register(r'pdf-extractor', views.PDFExtractorView, basename='pdf-extractor')

# Admin/Instructor Routes
router.register(r'admin/career-paths', admin_views.AdminCareerPathViewSet, basename='admin-career-path')
router.register(r'admin/modules', admin_views.AdminLearningModuleViewSet, basename='admin-module')

# Live Quiz routes
router.register(r'live-quiz', views_live_quiz.LiveQuizViewSet, basename='live-quiz')
router.register(r'live-quiz-questions', views_live_quiz.LiveQuizQuestionViewSet, basename='live-quiz-question')
router.register(r'live-quiz-sessions', views_live_quiz.LiveQuizSessionViewSet, basename='live-quiz-session')
router.register(r'live-quiz-responses', views_live_quiz.LiveQuizResponseViewSet, basename='live-quiz-response')

urlpatterns = [
    path('', include(router.urls)),
]
