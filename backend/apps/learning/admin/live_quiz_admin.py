"""
Admin configuration for live quiz models
"""
from django.contrib import admin
from apps.learning.models import (
    LiveQuiz,
    LiveQuizQuestion,
    LiveQuizSession,
    LiveQuizParticipant,
    LiveQuizResponse
)


@admin.register(LiveQuiz)
class LiveQuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'join_code', 'is_active', 'created_at', 'started_at']
    list_filter = ['is_active', 'creation_method', 'created_at']
    search_fields = ['title', 'join_code', 'instructor__username']
    readonly_fields = ['id', 'join_code', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'instructor', 'title', 'description', 'creation_method')
        }),
        ('Session Configuration', {
            'fields': (
                'join_code',
                'is_active',
                'max_participants',
                'auto_advance_questions',
                'show_leaderboard',
                'show_correct_answers',
                'allow_late_join',
                'shuffle_questions',
                'shuffle_answers'
            )
        }),
        ('Anti-Cheating', {
            'fields': (
                'require_fullscreen',
                'auto_pause_on_exit',
                'max_violations',
                'violation_penalty_points'
            )
        }),
        ('Timing', {
            'fields': ('default_question_time', 'break_between_questions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'ended_at')
        }),
    )


@admin.register(LiveQuizQuestion)
class LiveQuizQuestionAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'order', 'question_type', 'points', 'time_limit']
    list_filter = ['question_type', 'programming_language']
    search_fields = ['question_text', 'quiz__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'quiz', 'order', 'question_type', 'question_text', 'image_url')
        }),
        ('Multiple Choice Options', {
            'fields': ('option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation')
        }),
        ('Coding Question', {
            'fields': ('programming_language', 'starter_code', 'test_cases', 'solution_code')
        }),
        ('Scoring', {
            'fields': ('points', 'time_limit', 'time_bonus_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(LiveQuizSession)
class LiveQuizSessionAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'status', 'total_participants', 'active_participants', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['quiz__title', 'quiz__join_code']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(LiveQuizParticipant)
class LiveQuizParticipantAdmin(admin.ModelAdmin):
    list_display = ['nickname', 'student', 'session', 'total_score', 'rank', 'is_active', 'is_flagged']
    list_filter = ['is_active', 'is_flagged', 'is_paused']
    search_fields = ['nickname', 'student__username', 'session__quiz__title']
    readonly_fields = ['id', 'joined_at', 'last_seen']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'session', 'student', 'nickname')
        }),
        ('Scoring', {
            'fields': ('total_score', 'total_correct', 'total_attempted', 'average_response_time', 'rank')
        }),
        ('Anti-Cheating', {
            'fields': (
                'fullscreen_violations',
                'tab_switch_count',
                'copy_paste_attempts',
                'is_flagged'
            )
        }),
        ('State', {
            'fields': ('is_paused', 'pause_reason', 'is_active', 'websocket_id')
        }),
        ('Timestamps', {
            'fields': ('joined_at', 'left_at', 'last_seen')
        }),
    )


@admin.register(LiveQuizResponse)
class LiveQuizResponseAdmin(admin.ModelAdmin):
    list_display = ['participant', 'question', 'is_correct', 'points_earned', 'response_time_seconds', 'answered_at']
    list_filter = ['is_correct', 'answered_at']
    search_fields = ['participant__nickname', 'question__question_text']
    readonly_fields = ['id', 'answered_at']
