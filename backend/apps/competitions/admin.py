from django.contrib import admin
from .models import (
    Competition, Challenge, CompetitionRegistration, Submission,
    Leaderboard, Achievement, TestCase
)

@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'difficulty', 'start_time', 'end_time', 'current_participants', 'max_participants']
    list_filter = ['status', 'difficulty']
    search_fields = ['title', 'description']

@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ['title', 'competition', 'challenge_type', 'difficulty', 'points', 'time_limit']
    list_filter = ['challenge_type', 'difficulty']
    search_fields = ['title', 'problem_statement']

@admin.register(CompetitionRegistration)
class CompetitionRegistrationAdmin(admin.ModelAdmin):
    list_display = ['competition', 'participant', 'registered_at']
    search_fields = ['competition__title', 'participant__username']

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['challenge', 'participant', 'language', 'status', 'score', 'submitted_at']
    list_filter = ['language', 'status']
    search_fields = ['participant__username', 'challenge__title']

@admin.register(Leaderboard)
class LeaderboardAdmin(admin.ModelAdmin):
    list_display = ['competition', 'participant', 'rank', 'total_score', 'challenges_solved']
    list_filter = ['competition']
    search_fields = ['participant__username', 'competition__title']

@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['user', 'competition', 'achievement_type', 'points_awarded', 'earned_at']
    list_filter = ['achievement_type']
    search_fields = ['user__username', 'competition__title']

@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ['challenge', 'order', 'is_hidden', 'points', 'time_limit', 'memory_limit']
    list_filter = ['is_hidden']
    search_fields = ['challenge__title']
