from django.contrib import admin
from .models import (
    Post, Comment, PostLike, CommentLike, PostTag, Hashtag,
    Notification, Report, UserFollow, Badge, UserBadge
)

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'post_type', 'like_count', 'comment_count', 'is_pinned', 'created_at']
    list_filter = ['post_type', 'is_pinned', 'is_locked']
    search_fields = ['title', 'content', 'author__username']

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['post', 'author', 'parent', 'like_count', 'is_edited', 'created_at']
    list_filter = ['is_edited']
    search_fields = ['content', 'author__username', 'post__title']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'sender', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['recipient__username', 'sender__username', 'title', 'message']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['reporter', 'report_type', 'status', 'moderator', 'created_at']
    list_filter = ['report_type', 'status']
    search_fields = ['reporter__username', 'reason']

@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'badge_type', 'points_required']
    list_filter = ['badge_type']
    search_fields = ['name', 'description']

@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    search_fields = ['user__username', 'badge__name']

@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'following', 'created_at']
    search_fields = ['follower__username', 'following__username']

admin.site.register(PostLike)
admin.site.register(CommentLike)
admin.site.register(PostTag)
admin.site.register(Hashtag)
