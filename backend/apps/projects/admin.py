from django.contrib import admin
from .models import (
    Project, ProjectMembership, ProjectTask, TaskLabel, ProjectTag,
    ProjectFile, CodeReview, ReviewComment, ProjectActivity
)

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'project_type', 'status', 'visibility', 'created_at']
    list_filter = ['project_type', 'programming_language', 'status', 'visibility', 'is_snsu_ccis_project']
    search_fields = ['name', 'description', 'owner__username']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(ProjectMembership)
class ProjectMembershipAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'role', 'joined_at', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['project__name', 'user__username']

@admin.register(ProjectTask)
class ProjectTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'assigned_to', 'status', 'priority', 'due_date']
    list_filter = ['status', 'priority']
    search_fields = ['title', 'description', 'project__name']

@admin.register(CodeReview)
class CodeReviewAdmin(admin.ModelAdmin):
    list_display = ['project', 'requester', 'reviewer', 'status', 'requested_at']
    list_filter = ['status']
    search_fields = ['project__name', 'requester__username', 'reviewer__username']

@admin.register(ProjectActivity)
class ProjectActivityAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'activity_type', 'created_at']
    list_filter = ['activity_type']
    search_fields = ['project__name', 'user__username', 'description']

admin.site.register(TaskLabel)
admin.site.register(ProjectTag)
admin.site.register(ProjectFile)
admin.site.register(ReviewComment)
