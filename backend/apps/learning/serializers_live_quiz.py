"""
Live Quiz System - DRF Serializers
Handles serialization for quiz management, sessions, and real-time updates
"""
from rest_framework import serializers
from apps.learning.models import (
    LiveQuiz,
    LiveQuizQuestion,
    LiveQuizSession,
    LiveQuizParticipant,
    LiveQuizResponse
)
from apps.accounts.serializers import UserSerializer


class LiveQuizQuestionSerializer(serializers.ModelSerializer):
    """Serializer for quiz questions"""
    
    class Meta:
        model = LiveQuizQuestion
        fields = [
            'id', 'quiz', 'question_text', 'question_type', 'order',
            'image_url', 'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'explanation', 'programming_language',
            'starter_code', 'test_cases', 'solution_code', 'points',
            'time_limit', 'time_bonus_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate question data based on question type"""
        question_type = data.get('question_type')
        
        if question_type == 'multiple_choice':
            # Ensure at least 2 options are provided
            if not data.get('option_a') or not data.get('option_b'):
                raise serializers.ValidationError(
                    "Multiple choice questions must have at least options A and B"
                )
            # Validate correct answer is one of the options
            correct = data.get('correct_answer', '').upper()
            if correct not in ['A', 'B', 'C', 'D']:
                raise serializers.ValidationError(
                    "Correct answer must be A, B, C, or D"
                )
        
        elif question_type == 'true_false':
            # Validate correct answer is True or False
            correct = data.get('correct_answer', '').upper()
            if correct not in ['TRUE', 'FALSE']:
                raise serializers.ValidationError(
                    "Correct answer for True/False must be 'True' or 'False'"
                )
        
        elif question_type == 'coding':
            # Validate programming language is specified
            if not data.get('programming_language'):
                raise serializers.ValidationError(
                    "Programming language is required for coding questions"
                )
        
        return data


class LiveQuizSerializer(serializers.ModelSerializer):
    """Serializer for live quiz configuration"""
    
    instructor_name = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    questions = LiveQuizQuestionSerializer(many=True, read_only=True, source='live_questions')
    status_text = serializers.CharField(source='get_status_text', read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = LiveQuiz
        fields = [
            'id', 'instructor', 'instructor_name', 'title', 'description',
            'creation_method', 'quiz_mode', 'source_file', 'ai_prompt_text', 'is_active',
            'join_code', 'max_participants', 'auto_advance_questions',
            'show_leaderboard', 'show_correct_answers', 'allow_late_join',
            'shuffle_questions', 'shuffle_answers', 'require_fullscreen',
            'auto_pause_on_exit', 'max_violations', 'violation_penalty_points',
            'fullscreen_exit_action', 'alt_tab_action',
            'enable_ai_proctor', 'enable_code_execution',
            'default_question_time', 'break_between_questions',
            # Scheduling fields
            'scheduled_start', 'deadline', 'max_retakes', 'time_limit_minutes',
            'status_text', 'is_open',
            # Timestamps
            'created_at', 'updated_at', 'started_at', 'ended_at',
            'questions_count', 'questions'
        ]
        read_only_fields = ['id', 'join_code', 'created_at', 'updated_at', 'instructor', 'status_text', 'is_open']
    
    def get_instructor_name(self, obj):
        name = f'{obj.instructor.first_name or ""} {obj.instructor.last_name or ""}'.strip()
        return name or obj.instructor.username

    def get_questions_count(self, obj):
        return obj.live_questions.count()
    
    def create(self, validated_data):
        """Auto-assign current user as instructor"""
        request = self.context.get('request')
        validated_data['instructor'] = request.user
        return super().create(validated_data)


class LiveQuizQuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions (without quiz FK, added by view)"""
    
    class Meta:
        model = LiveQuizQuestion
        fields = [
            'question_text', 'question_type', 'order', 'image_url',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'explanation', 'programming_language',
            'starter_code', 'test_cases', 'solution_code', 'points',
            'time_limit', 'time_bonus_enabled'
        ]


class LiveQuizCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a quiz with questions"""
    
    questions = LiveQuizQuestionCreateSerializer(many=True, required=False)
    
    class Meta:
        model = LiveQuiz
        fields = [
            'title', 'description', 'creation_method', 'quiz_mode', 'source_file',
            'ai_prompt_text', 'max_participants', 'auto_advance_questions',
            'show_leaderboard', 'show_correct_answers', 'allow_late_join',
            'shuffle_questions', 'shuffle_answers', 'require_fullscreen',
            'auto_pause_on_exit', 'max_violations', 'violation_penalty_points',
            'fullscreen_exit_action', 'alt_tab_action',
            'enable_ai_proctor', 'enable_code_execution',
            'default_question_time', 'break_between_questions',
            # Scheduling fields
            'scheduled_start', 'deadline', 'max_retakes', 'time_limit_minutes',
            'questions'
        ]
    
    def create(self, validated_data):
        """Create quiz and associated questions"""
        questions_data = validated_data.pop('questions', [])
        request = self.context.get('request')
        validated_data['instructor'] = request.user
        
        quiz = LiveQuiz.objects.create(**validated_data)
        
        # Create questions
        for question_data in questions_data:
            LiveQuizQuestion.objects.create(quiz=quiz, **question_data)
        
        return quiz


class LiveQuizParticipantSerializer(serializers.ModelSerializer):
    """Serializer for quiz participants"""
    
    student_info = UserSerializer(source='student', read_only=True)
    
    class Meta:
        model = LiveQuizParticipant
        fields = [
            'id', 'session', 'student', 'student_info', 'nickname',
            'total_score', 'total_correct', 'total_attempted',
            'average_response_time', 'rank', 'fullscreen_violations',
            'tab_switch_count', 'copy_paste_attempts', 'is_flagged',
            'is_paused', 'pause_reason', 'is_active', 'joined_at',
            'left_at', 'last_seen'
        ]
        read_only_fields = [
            'id', 'total_score', 'total_correct', 'total_attempted',
            'average_response_time', 'rank', 'fullscreen_violations',
            'tab_switch_count', 'copy_paste_attempts', 'is_flagged',
            'joined_at', 'left_at', 'last_seen'
        ]


class LiveQuizResponseSerializer(serializers.ModelSerializer):
    """Serializer for quiz responses"""
    
    class Meta:
        model = LiveQuizResponse
        fields = [
            'id', 'participant', 'question', 'answer_text',
            'code_submission', 'test_results', 'is_correct',
            'points_earned', 'response_time_seconds', 'answered_at'
        ]
        read_only_fields = ['id', 'points_earned', 'answered_at']


class LiveQuizSessionSerializer(serializers.ModelSerializer):
    """Serializer for quiz sessions"""
    
    quiz_info = LiveQuizSerializer(source='quiz', read_only=True)
    current_question_info = LiveQuizQuestionSerializer(source='current_question', read_only=True)
    participants = LiveQuizParticipantSerializer(many=True, read_only=True)
    
    class Meta:
        model = LiveQuizSession
        fields = [
            'id', 'quiz', 'quiz_info', 'status', 'current_question',
            'current_question_info', 'current_question_started_at',
            'total_participants', 'active_participants',
            'total_questions_shown', 'created_at', 'updated_at',
            'participants'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LeaderboardEntrySerializer(serializers.Serializer):
    """Serializer for leaderboard entries"""
    
    rank = serializers.IntegerField()
    participant_id = serializers.UUIDField()
    nickname = serializers.CharField()
    total_score = serializers.IntegerField()
    total_correct = serializers.IntegerField()
    total_attempted = serializers.IntegerField()
    average_response_time = serializers.FloatField()
    is_flagged = serializers.BooleanField()


class QuizResultsSerializer(serializers.Serializer):
    """Serializer for final quiz results"""
    
    quiz_id = serializers.UUIDField()
    quiz_title = serializers.CharField()
    total_participants = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    leaderboard = LeaderboardEntrySerializer(many=True)
    average_score = serializers.FloatField()
    completion_rate = serializers.FloatField()
