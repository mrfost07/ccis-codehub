"""
Serializers for AI Mentor app
"""
from rest_framework import serializers
from .models import (
    AIMentorProfile, ProjectMentorSession, AIMessage,
    CodeAnalysis, LearningRecommendation, ProjectGuidance, AIFeedback
)


class AIMentorProfileSerializer(serializers.ModelSerializer):
    """Serializer for AIMentorProfile model"""
    
    class Meta:
        model = AIMentorProfile
        fields = [
            'id', 'user', 'preferred_ai_model', 'total_interactions',
            'total_tokens_used', 'code_analyses_count', 
            'recommendations_followed', 'interaction_history',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'total_interactions', 'total_tokens_used', 
                            'code_analyses_count', 'recommendations_followed']


class AIMessageSerializer(serializers.ModelSerializer):
    """Serializer for AIMessage model"""
    
    class Meta:
        model = AIMessage
        fields = [
            'id', 'session', 'sender', 'message', 'metadata',
            'tokens_used', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ProjectMentorSessionSerializer(serializers.ModelSerializer):
    """Serializer for ProjectMentorSession model"""
    messages = AIMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProjectMentorSession
        fields = [
            'id', 'user', 'project', 'title', 'session_type', 'status',
            'started_at', 'ended_at', 'messages'
        ]
        read_only_fields = ['id', 'user', 'started_at', 'messages']






class CodeAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for CodeAnalysis model"""
    
    class Meta:
        model = CodeAnalysis
        fields = [
            'id', 'user', 'session', 'code_snippet', 'language', 
            'analysis_type', 'analysis_result', 'suggestions', 
            'complexity_score', 'analyzed_at'
        ]
        read_only_fields = ['id', 'user', 'analyzed_at']


class LearningRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for LearningRecommendation model"""
    
    class Meta:
        model = LearningRecommendation
        fields = [
            'id', 'user', 'learning_module', 'career_path',
            'recommendation_type', 'reason', 'priority',
            'is_completed', 'created_at', 'completed_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class ProjectGuidanceSerializer(serializers.ModelSerializer):
    """Serializer for ProjectGuidance model"""
    
    class Meta:
        model = ProjectGuidance
        fields = [
            'id', 'user', 'project', 'guidance_type', 'question',
            'guidance', 'resources', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class AIFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for AIFeedback model"""
    
    class Meta:
        model = AIFeedback
        fields = [
            'id', 'user', 'session', 'message', 'rating',
            'feedback', 'is_helpful', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']
