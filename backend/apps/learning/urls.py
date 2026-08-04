"""
Learning app URL configuration with live quiz, coding challenges, and video courses
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import (
    views, views_live_quiz, views_coding, views_video, views_jobs, admin_views,
    views_career_map,
)

router = DefaultRouter()
# Public/Student Routes
router.register(r'career-paths', views.CareerPathViewSet, basename='career-path')
router.register(r'modules', views.LearningModuleViewSet, basename='module')
router.register(r'quizzes', views.QuizViewSet, basename='quiz')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'progress', views.UserProgressViewSet, basename='progress')
router.register(r'certificates', views.CertificateViewSet, basename='certificate')
router.register(r'skills', views.AchievedSkillViewSet, basename='skill')
router.register(r'badges', views.BadgeViewSet, basename='badge')
router.register(r'leaderboard', views.LeaderboardViewSet, basename='leaderboard')
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

# Coding Challenges (LeetCode-style)
router.register(r'challenges', views_coding.CodingChallengeViewSet, basename='challenge')

# Video Courses (YouTube embed)
router.register(r'video-courses', views_video.VideoCourseViewSet, basename='video-course')

# Job Fetcher (Phase 6)
router.register(r'jobs', views_jobs.JobViewSet, basename='job')

urlpatterns = [
    # The career map is a single read of the whole tree, not a collection to
    # page through, so it is a plain view rather than a router resource.
    path('career-map/', views_career_map.CareerMapView.as_view(), name='career-map'),
    path('', include(router.urls)),
]

