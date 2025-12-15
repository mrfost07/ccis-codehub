"""
Serializers for Learning Admin API
"""
from rest_framework import serializers
from .models import (
    CareerPath, LearningModule, Quiz, Question, QuestionChoice,
    Enrollment, ModuleProgress, QuizAttempt
)
from apps.accounts.serializers import UserSerializer


class ModuleFileSerializer(serializers.Serializer):
    """Serializer for file upload"""
    id = serializers.UUIDField(read_only=True)
    file_type = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    version = serializers.IntegerField(read_only=True)
    parse_status = serializers.CharField(read_only=True)
    parsed_content = serializers.JSONField(read_only=True)
    uploaded_at = serializers.DateTimeField(read_only=True)
    confirmed = serializers.BooleanField(read_only=True)


class PathAnalyticsSerializer(serializers.Serializer):
    """Path analytics data"""
    total_views = serializers.IntegerField()
    unique_viewers = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()
    completed_enrollments = serializers.IntegerField()
    avg_completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    avg_time_to_complete = serializers.DurationField()
    drop_off_points = serializers.JSONField()


class ModuleAnalyticsSerializer(serializers.Serializer):
    """Module analytics data"""
    total_views = serializers.IntegerField()
    unique_viewers = serializers.IntegerField()
    total_starts = serializers.IntegerField()
    total_completions = serializers.IntegerField()
    completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    avg_time_spent = serializers.DurationField()
    slide_drop_off = serializers.JSONField()


class QuizAnalyticsSerializer(serializers.Serializer):
    """Quiz analytics data"""
    total_attempts = serializers.IntegerField()
    unique_takers = serializers.IntegerField()
    avg_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    highest_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    lowest_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    pass_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    avg_time_spent = serializers.DurationField()
    question_difficulty = serializers.JSONField()


class AdminCareerPathSerializer(serializers.ModelSerializer):
    """Admin view of career paths with full details"""
    modules_count = serializers.IntegerField(read_only=True)
    enrollments_count = serializers.IntegerField(read_only=True)
    analytics = PathAnalyticsSerializer(read_only=True)
    
    class Meta:
        model = CareerPath
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'slug']
    
    def create(self, validated_data):
        # Auto-generate slug from name
        if not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)


class AdminLearningModuleSerializer(serializers.ModelSerializer):
    """Admin view of modules with full details"""
    career_path_name = serializers.CharField(source='career_path.name', read_only=True)
    quiz_count = serializers.SerializerMethodField()
    analytics = ModuleAnalyticsSerializer(read_only=True)
    files = ModuleFileSerializer(many=True, read_only=True)
    
    class Meta:
        model = LearningModule
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_quiz_count(self, obj):
        return obj.quizzes.count() if hasattr(obj, 'quizzes') else 0


class QuestionChoiceAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for question choices"""
    
    class Meta:
        model = QuestionChoice
        fields = ['id', 'choice_text', 'is_correct', 'order']


class AdminQuestionSerializer(serializers.ModelSerializer):
    """Admin view of questions"""
    choices = QuestionChoiceAdminSerializer(many=True, required=False)
    
    class Meta:
        model = Question
        fields = '__all__'
    
    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        question = Question.objects.create(**validated_data)
        
        for choice_data in choices_data:
            QuestionChoice.objects.create(question=question, **choice_data)
        
        return question
    
    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        
        # Update question fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update choices if provided
        if choices_data is not None:
            # Delete old choices and create new ones
            instance.choices.all().delete()
            for choice_data in choices_data:
                QuestionChoice.objects.create(question=instance, **choice_data)
        
        return instance


class AdminQuizSerializer(serializers.ModelSerializer):
    """Admin view of quizzes"""
    module_title = serializers.CharField(source='module.title', read_only=True)
    questions_count = serializers.SerializerMethodField()
    analytics = QuizAnalyticsSerializer(read_only=True)
    questions = AdminQuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_questions_count(self, obj):
        return obj.questions.count()


class AdminOverviewSerializer(serializers.Serializer):
    """Overview dashboard data"""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    
    total_paths = serializers.IntegerField()
    active_paths = serializers.IntegerField()
    
    total_modules = serializers.IntegerField()
    total_uploads = serializers.IntegerField()
    pending_uploads = serializers.IntegerField()
    
    total_quizzes = serializers.IntegerField()
    
    total_enrollments = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()
    
    avg_completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    recent_errors = serializers.ListField()
    pending_moderation = serializers.IntegerField()


class ContentModerationSerializer(serializers.Serializer):
    """Content moderation item"""
    id = serializers.UUIDField()
    content_type = serializers.CharField()
    content_preview = serializers.CharField()
    submitted_by = UserSerializer(read_only=True)
    submitted_at = serializers.DateTimeField()
    status = serializers.CharField()
    is_spam = serializers.BooleanField()
    is_inappropriate = serializers.BooleanField()
    is_plagiarism = serializers.BooleanField()


class SystemSettingsSerializer(serializers.Serializer):
    """System settings"""
    id = serializers.UUIDField()
    key = serializers.CharField()
    value = serializers.CharField()
    value_type = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    is_editable = serializers.BooleanField()
