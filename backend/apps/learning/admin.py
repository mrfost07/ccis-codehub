from django.contrib import admin
from .models import (
    CareerPath, LearningModule, Quiz, Question, QuestionChoice,
    UserProgress, QuizAttempt, Answer, Certificate, Enrollment, ModuleProgress,
    LiveQuiz, LiveQuizQuestion, LiveQuizSession, LiveQuizParticipant, LiveQuizResponse,
    CodingChallenge, CodingSubmission, VideoCourse, VideoLesson, VideoProgress
)

@admin.register(CareerPath)
class CareerPathAdmin(admin.ModelAdmin):
    list_display = ['name', 'program_type', 'difficulty_level', 'is_active', 'is_featured']
    list_filter = ['program_type', 'difficulty_level', 'is_active', 'is_featured']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(LearningModule)
class LearningModuleAdmin(admin.ModelAdmin):
    list_display = ['title', 'career_path', 'module_type', 'difficulty_level', 'order', 'is_locked']
    list_filter = ['module_type', 'difficulty_level', 'is_locked']
    search_fields = ['title', 'description']
    ordering = ['career_path', 'order']

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'learning_module', 'time_limit_minutes', 'passing_score', 'max_attempts']
    list_filter = ['passing_score', 'randomize_questions']
    search_fields = ['title', 'description']

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'question_type', 'points', 'order']
    list_filter = ['question_type']
    search_fields = ['question_text']

@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'career_path', 'completion_percentage', 'is_completed', 'started_at']
    list_filter = ['is_completed']
    search_fields = ['user__username', 'user__email', 'career_path__name']

@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ['user', 'quiz', 'score', 'status', 'started_at', 'submitted_at']
    list_filter = ['status']
    search_fields = ['user__username', 'quiz__title']

admin.site.register(QuestionChoice)
admin.site.register(Answer)
admin.site.register(Certificate)

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'career_path', 'status', 'progress_percentage', 'enrolled_at', 'completed_at']
    list_filter = ['status']
    search_fields = ['user__username', 'career_path__name']
    ordering = ['-enrolled_at']

@admin.register(ModuleProgress)
class ModuleProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'module', 'status', 'started_at', 'completed_at']
    list_filter = ['status']
    search_fields = ['user__username', 'module__title']
    ordering = ['enrollment', 'module__order']


# Live Quiz Admin
@admin.register(LiveQuiz)
class LiveQuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'join_code', 'is_active', 'creation_method', 'created_at']
    list_filter = ['is_active', 'creation_method', 'require_fullscreen']
    search_fields = ['title', 'join_code', 'instructor__username']
    readonly_fields = ['id', 'join_code', 'created_at', 'updated_at']
    ordering = ['-created_at']

@admin.register(LiveQuizQuestion)
class LiveQuizQuestionAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'order', 'question_type', 'points', 'time_limit']
    list_filter = ['question_type', 'programming_language']
    search_fields = ['question_text', 'quiz__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['quiz', 'order']

@admin.register(LiveQuizSession)
class LiveQuizSessionAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'status', 'total_participants', 'active_participants', 'created_at']
    list_filter = ['status']
    search_fields = ['quiz__title', 'quiz__join_code']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(LiveQuizParticipant)
class LiveQuizParticipantAdmin(admin.ModelAdmin):
    list_display = ['nickname', 'student', 'total_score', 'rank', 'is_active', 'is_flagged']
    list_filter = ['is_active', 'is_flagged', 'is_paused']
    search_fields = ['nickname', 'student__username', 'session__quiz__title']
    readonly_fields = ['id', 'joined_at', 'last_seen']
    ordering = ['-total_score']

@admin.register(LiveQuizResponse)
class LiveQuizResponseAdmin(admin.ModelAdmin):
    list_display = ['participant', 'question', 'is_correct', 'points_earned', 'response_time_seconds', 'answered_at']
    list_filter = ['is_correct']
    search_fields = ['participant__nickname', 'question__question_text']
    readonly_fields = ['id', 'answered_at']


# Coding Challenges Admin
@admin.register(CodingChallenge)
class CodingChallengeAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'category', 'points', 'total_attempts', 'total_solved', 'is_active']
    list_filter = ['difficulty', 'category', 'is_active']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['total_attempts', 'total_solved', 'created_at', 'updated_at']
    ordering = ['difficulty', 'category', 'title']

@admin.register(CodingSubmission)
class CodingSubmissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'challenge', 'language', 'status', 'passed_tests', 'total_tests', 'points_earned', 'submitted_at']
    list_filter = ['status', 'language']
    search_fields = ['user__username', 'challenge__title']
    readonly_fields = ['id', 'submitted_at']
    ordering = ['-submitted_at']


# Video Courses Admin
class VideoLessonInline(admin.TabularInline):
    model = VideoLesson
    extra = 1
    ordering = ['order']

@admin.register(VideoCourse)
class VideoCourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor_name', 'category', 'difficulty', 'is_published', 'is_featured']
    list_filter = ['category', 'difficulty', 'is_published', 'is_featured']
    search_fields = ['title', 'description', 'instructor_name']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']
    inlines = [VideoLessonInline]

@admin.register(VideoProgress)
class VideoProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'is_completed', 'watched_seconds', 'last_watched_at']
    list_filter = ['is_completed']
    search_fields = ['user__username', 'lesson__title']

