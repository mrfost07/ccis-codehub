"""
URL configuration for projects app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, ProjectTaskViewSet, CodeReviewViewSet,
    ReviewCommentViewSet, ProjectFileViewSet,
    TeamInvitationViewSet, TaskCommentViewSet, ProjectBranchViewSet,
    ProjectCommitViewSet, PullRequestViewSet, PRCommentViewSet,
    TeamViewSet, TeamMembershipViewSet, ProjectNotificationViewSet
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', ProjectTaskViewSet, basename='project-task')
router.register(r'reviews', CodeReviewViewSet, basename='code-review')
router.register(r'comments', ReviewCommentViewSet, basename='review-comment')
router.register(r'files', ProjectFileViewSet, basename='project-file')
router.register(r'invitations', TeamInvitationViewSet, basename='team-invitation')
router.register(r'task-comments', TaskCommentViewSet, basename='task-comment')
router.register(r'branches', ProjectBranchViewSet, basename='project-branch')
router.register(r'commits', ProjectCommitViewSet, basename='project-commit')
router.register(r'pull-requests', PullRequestViewSet, basename='pull-request')
router.register(r'pr-comments', PRCommentViewSet, basename='pr-comment')
# Team-first project management
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'team-memberships', TeamMembershipViewSet, basename='team-membership')
router.register(r'notifications', ProjectNotificationViewSet, basename='project-notification')

urlpatterns = [
    path('', include(router.urls)),
]

