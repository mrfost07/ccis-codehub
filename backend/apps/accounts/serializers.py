"""
Serializers for accounts app
"""
from rest_framework import serializers
from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    total_projects = serializers.SerializerMethodField()
    tasks_completed = serializers.SerializerMethodField()
    active_projects = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'github_username', 'linkedin_url', 'website_url', 'location',
            'total_courses_completed', 'total_modules_completed', 
            'total_projects', 'total_posts', 'total_likes_received',
            'total_comments', 'contribution_points', 'current_streak',
            'longest_streak', 'certificates_earned', 'theme_preference',
            'profile_background', 'created_at', 'updated_at', 'tasks_completed', 
            'active_projects'
        ]
        read_only_fields = ['created_at', 'updated_at', 'total_courses_completed',
                          'total_modules_completed', 'total_projects', 'total_posts',
                          'total_likes_received', 'total_comments', 'contribution_points',
                          'current_streak', 'longest_streak', 'certificates_earned']
    
    def get_total_projects(self, obj):
        try:
            from apps.projects.models import Project, ProjectMembership
            user = obj.user
            owned = Project.objects.filter(owner=user).count()
            member = ProjectMembership.objects.filter(user=user, is_active=True).count()
            return owned + member
        except:
            return obj.total_projects
    
    def get_tasks_completed(self, obj):
        try:
            from apps.projects.models import ProjectTask
            return ProjectTask.objects.filter(assigned_to=obj.user, status='done').count()
        except:
            return 0
    
    def get_active_projects(self, obj):
        try:
            from apps.projects.models import Project, ProjectMembership
            user = obj.user
            owned = Project.objects.filter(owner=user, status__in=['active', 'in_progress']).count()
            member = ProjectMembership.objects.filter(
                user=user, is_active=True, 
                project__status__in=['active', 'in_progress']
            ).count()
            return owned + member
        except:
            return 0


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'role', 
            'program', 'year_level', 'profile_picture', 'bio', 'skills', 
            'career_interests', 'followers_count', 'following_count',
            'is_active', 'created_at', 'updated_at', 'profile'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'followers_count', 'following_count']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password', 
                 'confirm_password', 'role', 'program', 'year_level']
        
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
