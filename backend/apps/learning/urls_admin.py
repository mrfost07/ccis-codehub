"""
URL Configuration for Admin Learning Management
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin_complete import (
    AdminOverviewView,
    AdminPathViewSet,
    AdminModuleViewSet,
    AdminQuizViewSet,
    AdminSearchView,
    AdminUserManagementView,
    AdminAnalyticsView,
)

router = DefaultRouter()
router.register(r'paths', AdminPathViewSet, basename='admin-path')
router.register(r'modules', AdminModuleViewSet, basename='admin-module')
router.register(r'quizzes', AdminQuizViewSet, basename='admin-quiz')
router.register(r'users', AdminUserManagementView, basename='admin-user')

urlpatterns = [
    # Overview dashboard
    path('overview/', AdminOverviewView.as_view(), name='admin-overview'),
    
    # Search
    path('search/', AdminSearchView.as_view(), name='admin-search'),
    
    # Analytics
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    
    # Router URLs
    path('', include(router.urls)),
]
