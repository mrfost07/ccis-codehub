from django.contrib import admin
from .models import (
    AIMentorProfile, ProjectMentorSession, AIMessage, CodeAnalysis,
    LearningRecommendation, ProjectGuidance, AIFeedback
)

@admin.register(AIMentorProfile)
class AIMentorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'preferred_ai_model', 'total_interactions', 'code_analyses_count', 'total_tokens_used']
    list_filter = ['preferred_ai_model']
    search_fields = ['user__username', 'user__email']

@admin.register(ProjectMentorSession)
class ProjectMentorSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'project', 'session_type', 'status', 'started_at', 'ended_at']
    list_filter = ['session_type', 'status']
    search_fields = ['user__username', 'project__name']

@admin.register(AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
    list_display = ['session', 'sender', 'tokens_used', 'created_at']
    list_filter = ['sender']
    search_fields = ['message', 'session__user__username']

@admin.register(CodeAnalysis)
class CodeAnalysisAdmin(admin.ModelAdmin):
    list_display = ['user', 'language', 'analysis_type', 'complexity_score', 'analyzed_at']
    list_filter = ['language', 'analysis_type']
    search_fields = ['user__username', 'code_snippet']

@admin.register(LearningRecommendation)
class LearningRecommendationAdmin(admin.ModelAdmin):
    list_display = ['user', 'recommendation_type', 'priority', 'is_completed', 'created_at']
    list_filter = ['recommendation_type', 'priority', 'is_completed']
    search_fields = ['user__username', 'reason']

@admin.register(ProjectGuidance)
class ProjectGuidanceAdmin(admin.ModelAdmin):
    list_display = ['user', 'project', 'guidance_type', 'created_at']
    list_filter = ['guidance_type']
    search_fields = ['user__username', 'project__name', 'question']

admin.site.register(AIFeedback)
