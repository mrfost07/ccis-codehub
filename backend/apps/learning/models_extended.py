"""
Extended models for Learning Admin system
Add these to your existing learning/models.py
"""
import uuid
import json
from django.db import models
from django.utils.text import slugify
from django.conf import settings


class ModuleFile(models.Model):
    """Stores uploaded module files with versioning"""
    
    FILE_TYPE_CHOICES = [
        ('docx', 'Word Document'),
        ('pdf', 'PDF Document'),
        ('pptx', 'PowerPoint'),
        ('md', 'Markdown'),
    ]
    
    PARSE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey('LearningModule', on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='module_files/')
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_size = models.BigIntegerField(help_text='File size in bytes')
    version = models.IntegerField(default=1)
    
    # Parsing data
    parse_status = models.CharField(max_length=20, choices=PARSE_STATUS_CHOICES, default='pending')
    raw_text = models.TextField(blank=True, help_text='Extracted raw text')
    parsed_content = models.JSONField(null=True, blank=True, help_text='Parsed structured content')
    parse_error = models.TextField(blank=True)
    
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'module_files'
        ordering = ['-version', '-uploaded_at']
    
    def __str__(self):
        return f"{self.module.title} - v{self.version} ({self.file_type})"


class PathAnalytics(models.Model):
    """Analytics data for career paths"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    career_path = models.OneToOneField('CareerPath', on_delete=models.CASCADE, related_name='analytics')
    
    # View metrics
    total_views = models.IntegerField(default=0)
    unique_viewers = models.IntegerField(default=0)
    
    # Enrollment metrics
    total_enrollments = models.IntegerField(default=0)
    active_enrollments = models.IntegerField(default=0)
    completed_enrollments = models.IntegerField(default=0)
    
    # Completion metrics
    avg_completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    avg_time_to_complete = models.DurationField(null=True, blank=True)
    
    # Drop-off points (module IDs where users commonly stop)
    drop_off_points = models.JSONField(default=list)
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'path_analytics'
        verbose_name = 'Path Analytics'
        verbose_name_plural = 'Path Analytics'
    
    def __str__(self):
        return f"Analytics: {self.career_path.name}"


class ModuleAnalytics(models.Model):
    """Analytics data for learning modules"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.OneToOneField('LearningModule', on_delete=models.CASCADE, related_name='analytics')
    
    # View metrics
    total_views = models.IntegerField(default=0)
    unique_viewers = models.IntegerField(default=0)
    
    # Completion metrics
    total_starts = models.IntegerField(default=0)
    total_completions = models.IntegerField(default=0)
    completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    avg_time_spent = models.DurationField(null=True, blank=True)
    
    # Slide metrics
    avg_slides_viewed = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    slide_drop_off = models.JSONField(default=dict, help_text='Slide index: drop count')
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'module_analytics'
        verbose_name = 'Module Analytics'
        verbose_name_plural = 'Module Analytics'
    
    def __str__(self):
        return f"Analytics: {self.module.title}"


class QuizAnalytics(models.Model):
    """Analytics data for quizzes"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.OneToOneField('Quiz', on_delete=models.CASCADE, related_name='analytics')
    
    # Attempt metrics
    total_attempts = models.IntegerField(default=0)
    unique_takers = models.IntegerField(default=0)
    
    # Score metrics
    avg_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    highest_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    lowest_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    pass_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Time metrics
    avg_time_spent = models.DurationField(null=True, blank=True)
    
    # Question metrics
    question_difficulty = models.JSONField(default=dict, help_text='Question ID: % correct')
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quiz_analytics'
        verbose_name = 'Quiz Analytics'
        verbose_name_plural = 'Quiz Analytics'
    
    def __str__(self):
        return f"Analytics: {self.quiz.title}"


class SystemError(models.Model):
    """Track system errors for admin monitoring"""
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('acknowledged', 'Acknowledged'),
        ('investigating', 'Investigating'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    error_type = models.CharField(max_length=100)
    error_message = models.TextField()
    stack_trace = models.TextField(blank=True)
    
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    
    # Context
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    url = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    request_data = models.JSONField(null=True, blank=True)
    
    # Resolution
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='resolved_errors'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_errors'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['severity', 'status']),
        ]
    
    def __str__(self):
        return f"[{self.severity.upper()}] {self.error_type} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class ContentModeration(models.Model):
    """Content moderation queue for admin review"""
    
    CONTENT_TYPE_CHOICES = [
        ('post', 'Community Post'),
        ('comment', 'Comment'),
        ('project', 'Project'),
        ('message', 'Message'),
        ('file', 'File Upload'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('flagged', 'Flagged'),
        ('removed', 'Removed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    content_id = models.UUIDField()
    content_preview = models.TextField()
    
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='submitted_content'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_content'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Flags
    is_spam = models.BooleanField(default=False)
    is_inappropriate = models.BooleanField(default=False)
    is_plagiarism = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'content_moderation'
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status', '-submitted_at']),
            models.Index(fields=['content_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.content_type} by {self.submitted_by.username} - {self.status}"


class SystemSettings(models.Model):
    """Global system configuration"""
    
    SETTING_TYPE_CHOICES = [
        ('string', 'String'),
        ('integer', 'Integer'),
        ('boolean', 'Boolean'),
        ('json', 'JSON'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    value_type = models.CharField(max_length=20, choices=SETTING_TYPE_CHOICES, default='string')
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, default='general')
    
    is_public = models.BooleanField(default=False, help_text='Can non-admins read this?')
    is_editable = models.BooleanField(default=True, help_text='Can this be changed via UI?')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'system_settings'
        ordering = ['category', 'key']
    
    def __str__(self):
        return f"{self.category}.{self.key}"
    
    def get_typed_value(self):
        """Return value with correct type"""
        if self.value_type == 'integer':
            return int(self.value)
        elif self.value_type == 'boolean':
            return self.value.lower() in ('true', '1', 'yes')
        elif self.value_type == 'json':
            return json.loads(self.value)
        return self.value
