"""Serializers for Learning app models"""
from rest_framework import serializers
from .models import (
    CareerPath, LearningModule, Quiz, Question,
    QuestionChoice, UserProgress, QuizAttempt, Answer, Certificate,
    Enrollment, ModuleProgress
)


class CareerPathSerializer(serializers.ModelSerializer):
    """Serializer for CareerPath model"""
    total_modules = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    certificate_template_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CareerPath
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_modules(self, obj):
        return obj.modules.count()
    
    def get_enrolled_count(self, obj):
        return UserProgress.objects.filter(career_path=obj).values('user').distinct().count()
    
    def get_certificate_template_url(self, obj):
        """Get the full URL for the certificate template"""
        if obj.certificate_template:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.certificate_template.url)
            return obj.certificate_template.url if hasattr(obj.certificate_template, 'url') else None
        return None


class LearningModuleSerializer(serializers.ModelSerializer):
    """Serializer for LearningModule model"""
    career_path_name = serializers.CharField(source='career_path.name', read_only=True)
    quiz_count = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LearningModule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_quiz_count(self, obj):
        return obj.quizzes.count()
    
    def get_file_url(self, obj):
        """Get the full URL for the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url if hasattr(obj.file, 'url') else None
        return None
    
    def get_file_name(self, obj):
        """Get the file name"""
        if obj.file:
            return obj.file.name.split('/')[-1] if hasattr(obj.file, 'name') else None
        return None


class QuestionChoiceSerializer(serializers.ModelSerializer):
    """Serializer for QuestionChoice model"""
    
    class Meta:
        model = QuestionChoice
        fields = '__all__'
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for Question model"""
    choices = QuestionChoiceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for Quiz model"""
    questions = QuestionSerializer(many=True, read_only=True)
    module_title = serializers.CharField(source='learning_module.title', read_only=True)
    
    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer for UserProgress model"""
    career_path = CareerPathSerializer(read_only=True)
    learning_module = LearningModuleSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserProgress
        fields = '__all__'
        read_only_fields = ['id', 'started_at', 'completed_at', 'last_accessed_at']


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for QuizAttempt model"""
    quiz = QuizSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = QuizAttempt
        fields = '__all__'
        read_only_fields = ['id', 'started_at', 'submitted_at']


class AnswerSerializer(serializers.ModelSerializer):
    """Serializer for Answer model"""
    question = QuestionSerializer(read_only=True)
    
    class Meta:
        model = Answer
        fields = '__all__'
        read_only_fields = ['id']


class CertificateSerializer(serializers.ModelSerializer):
    """Serializer for Certificate model"""
    career_path = CareerPathSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Certificate
        fields = '__all__'
        read_only_fields = ['id', 'certificate_id', 'issued_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for Enrollment model"""
    career_path_name = serializers.CharField(source='career_path.name', read_only=True)
    career_path_details = CareerPathSerializer(source='career_path', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = ['id', 'user', 'enrolled_at', 'completed_at', 'progress_percentage', 'status']


class ModuleProgressSerializer(serializers.ModelSerializer):
    """Serializer for ModuleProgress model"""
    module_title = serializers.CharField(source='module.title', read_only=True)
    module_details = LearningModuleSerializer(source='module', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ModuleProgress
        fields = '__all__'
        read_only_fields = ['id', 'started_at', 'completed_at']
