"""
URLs for Community app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PostViewSet, CommentViewSet, HashtagViewSet,
    NotificationViewSet, UserFollowViewSet, BadgeViewSet, ReportViewSet,
    ChatRoomViewSet, ChatMessageViewSet, ChatNicknameViewSet, OrganizationViewSet
)

app_name = 'community'

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'hashtags', HashtagViewSet, basename='hashtag')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'follows', UserFollowViewSet, basename='follow')
router.register(r'badges', BadgeViewSet, basename='badge')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'organizations', OrganizationViewSet, basename='organization')

# Chat routes
router.register(r'chat/rooms', ChatRoomViewSet, basename='chat-room')
router.register(r'chat/messages', ChatMessageViewSet, basename='chat-message')
router.register(r'chat/nicknames', ChatNicknameViewSet, basename='chat-nickname')

urlpatterns = [
    path('', include(router.urls)),
]
