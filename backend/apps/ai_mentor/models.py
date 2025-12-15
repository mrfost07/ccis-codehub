"""
AI Mentor Integration Models
"""
import uuid
from django.db import models
from django.conf import settings


class AIMentorProfile(models.Model):
    """AI Mentor profile for users"""
    
    AI_MODEL_CHOICES = [
        # OpenRouter models (free)
        ('openrouter_gemini', 'Gemini 2.0 Flash (OpenRouter)'),
        ('openrouter_amazon_nova', 'Amazon Nova 2 Lite'),
        ('openrouter_deepseek', 'DeepSeek V3.1 NEX'),
        ('openrouter_mistral', 'Mistral Devstral'),
        # Direct API models
        ('google_gemini', 'Google Gemini (Direct)'),
        ('openai_gpt4', 'OpenAI GPT-4'),
        ('anthropic_claude', 'Anthropic Claude'),
        # Legacy
        ('openrouter', 'OpenRouter (Legacy)'),
        ('local', 'Local AI'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_mentor_profile')
    preferred_ai_model = models.CharField(max_length=30, choices=AI_MODEL_CHOICES, blank=True, null=True, help_text='User must select a model')
    total_interactions = models.IntegerField(default=0)
    code_analyses_count = models.IntegerField(default=0)
    recommendations_followed = models.IntegerField(default=0)
    total_tokens_used = models.IntegerField(default=0)
    interaction_history = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"AI Profile for {self.user.username}"


class ProjectMentorSession(models.Model):
    """AI mentoring sessions"""
    
    SESSION_TYPE_CHOICES = [
        ('general_chat', 'General Chat'),
        ('code_analysis', 'Code Analysis'),
        ('project_guidance', 'Project Guidance'),
        ('learning_help', 'Learning Help'),
        ('debugging', 'Debugging'),
        ('optimization', 'Optimization'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('archived', 'Archived'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_sessions')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, null=True, blank=True, related_name='ai_sessions')
    title = models.CharField(max_length=255, blank=True, null=True, help_text='Auto-generated title from first message')
    session_type = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.session_type} - {self.user.username}"


class AIMessage(models.Model):
    """Messages in AI mentor sessions"""
    
    SENDER_CHOICES = [
        ('user', 'User'),
        ('ai', 'AI'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ProjectMentorSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True, help_text='Context, code snippets, etc.')
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender} - {self.session}"


class CodeAnalysis(models.Model):
    """Code analysis by AI"""
    
    ANALYSIS_TYPE_CHOICES = [
        ('bug_detection', 'Bug Detection'),
        ('performance', 'Performance Analysis'),
        ('security', 'Security Analysis'),
        ('best_practices', 'Best Practices'),
        ('refactoring', 'Refactoring Suggestions'),
        ('complexity', 'Complexity Analysis'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='code_analyses')
    session = models.ForeignKey(ProjectMentorSession, on_delete=models.CASCADE, null=True, blank=True, related_name='code_analyses')
    code_snippet = models.TextField()
    language = models.CharField(max_length=50)
    analysis_type = models.CharField(max_length=20, choices=ANALYSIS_TYPE_CHOICES)
    analysis_result = models.JSONField(default=dict)
    suggestions = models.JSONField(default=list)
    complexity_score = models.IntegerField(default=0)
    analyzed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-analyzed_at']
        verbose_name_plural = 'Code analyses'
    
    def __str__(self):
        return f"{self.analysis_type} - {self.user.username}"


class LearningRecommendation(models.Model):
    """AI-generated learning recommendations"""
    
    RECOMMENDATION_TYPE_CHOICES = [
        ('skill_gap', 'Skill Gap'),
        ('trending', 'Trending'),
        ('personalized', 'Personalized'),
        ('career_path', 'Career Path'),
        ('project_based', 'Project Based'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_recommendations')
    learning_module = models.ForeignKey('learning.LearningModule', on_delete=models.CASCADE, null=True, blank=True)
    career_path = models.ForeignKey('learning.CareerPath', on_delete=models.CASCADE, null=True, blank=True)
    recommendation_type = models.CharField(max_length=20, choices=RECOMMENDATION_TYPE_CHOICES)
    reason = models.TextField()
    priority = models.IntegerField(default=3, help_text='1-5, where 5 is highest priority')
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-priority', '-created_at']
    
    def __str__(self):
        return f"{self.recommendation_type} for {self.user.username}"


class ProjectGuidance(models.Model):
    """AI guidance for projects"""
    
    GUIDANCE_TYPE_CHOICES = [
        ('architecture', 'Architecture Design'),
        ('tech_stack', 'Technology Stack'),
        ('implementation', 'Implementation'),
        ('debugging', 'Debugging'),
        ('optimization', 'Optimization'),
        ('best_practices', 'Best Practices'),
        ('testing', 'Testing Strategy'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_guidances')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='ai_guidances')
    guidance_type = models.CharField(max_length=20, choices=GUIDANCE_TYPE_CHOICES)
    question = models.TextField()
    guidance = models.TextField()
    resources = models.JSONField(default=list, help_text='Links, tutorials, documentation')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.guidance_type} - {self.project.name}"


class AIFeedback(models.Model):
    """User feedback on AI responses"""
    
    RATING_CHOICES = [
        (1, 'Very Poor'),
        (2, 'Poor'),
        (3, 'Average'),
        (4, 'Good'),
        (5, 'Excellent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_feedbacks')
    session = models.ForeignKey(ProjectMentorSession, on_delete=models.CASCADE, null=True, blank=True)
    message = models.ForeignKey(AIMessage, on_delete=models.CASCADE, null=True, blank=True)
    rating = models.IntegerField(choices=RATING_CHOICES)
    feedback = models.TextField(blank=True)
    is_helpful = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback from {self.user.username} - Rating: {self.rating}"
