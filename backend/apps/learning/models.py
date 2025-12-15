"""
Learning Management System Models
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class CareerPath(models.Model):
    """Career paths for different programs"""
    
    PROGRAM_CHOICES = [
        ('bsit', 'BS Information Technology'),
        ('bscs', 'BS Computer Science'),
        ('bsis', 'BS Information Systems'),
        ('general', 'General'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    program_type = models.CharField(max_length=10, choices=PROGRAM_CHOICES)
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    estimated_duration = models.IntegerField(help_text='Duration in weeks (1-52)')
    total_modules = models.IntegerField(default=0)
    max_modules = models.IntegerField(default=0, help_text='Maximum number of modules for this path (0 = unlimited)')
    points_reward = models.IntegerField(default=100)
    prerequisites = models.ManyToManyField('self', blank=True, symmetrical=False)
    required_skills = models.JSONField(default=list, blank=True)
    icon = models.URLField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#6366f1')
    certificate_template = models.FileField(upload_to='certificates/templates/', blank=True, null=True, help_text='Certificate template for course completion')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['program_type', 'difficulty_level', 'name']
        
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.program_type.upper()})"


class LearningModule(models.Model):
    """Individual learning modules within career paths"""
    
    MODULE_TYPE_CHOICES = [
        ('video', 'Video'),
        ('text', 'Text'),
        ('interactive', 'Interactive'),
        ('quiz', 'Quiz'),
        ('project', 'Project'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    career_path = models.ForeignKey(CareerPath, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField()
    module_type = models.CharField(max_length=20, choices=MODULE_TYPE_CHOICES)
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    content = models.TextField(help_text='For text content or video URL')
    file = models.FileField(upload_to='module_files/', blank=True, null=True, help_text='Upload module file (PDF, DOCX, etc.)')
    duration_minutes = models.IntegerField(default=30)
    points_reward = models.IntegerField(default=10)
    order = models.IntegerField(help_text='Order within the career path')
    prerequisites = models.ManyToManyField('self', blank=True, symmetrical=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['career_path', 'order']
        unique_together = ['career_path', 'order']
    
    def __str__(self):
        return f"{self.title} - {self.career_path.name}"


class Quiz(models.Model):
    """Quizzes associated with learning modules"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learning_module = models.ForeignKey(LearningModule, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255)
    description = models.TextField()
    content = models.TextField(blank=True, default='', help_text='Rich text content with slides for quiz questions')
    time_limit_minutes = models.IntegerField(default=30)
    passing_score = models.IntegerField(default=70, help_text='Percentage')
    max_attempts = models.IntegerField(default=3)
    randomize_questions = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Quiz: {self.title}"


class Question(models.Model):
    """Questions for quizzes"""
    
    QUESTION_TYPE_CHOICES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('coding', 'Coding'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES)
    correct_answer = models.JSONField()
    points = models.IntegerField(default=1)
    order = models.IntegerField(default=0)
    explanation = models.TextField(blank=True, help_text='Shown after answer')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['quiz', 'order']
    
    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}"


class QuestionChoice(models.Model):
    """Choices for multiple choice questions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    choice_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.choice_text


class UserProgress(models.Model):
    """Track user progress in learning paths and modules"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='learning_progress')
    career_path = models.ForeignKey(CareerPath, on_delete=models.CASCADE)
    learning_module = models.ForeignKey(LearningModule, on_delete=models.CASCADE, null=True, blank=True)
    completion_percentage = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    current_slide = models.IntegerField(default=0)  # Track current slide position
    total_slides = models.IntegerField(default=1)   # Total slides in module
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'career_path', 'learning_module']
        ordering = ['-last_accessed_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.career_path.name} ({self.completion_percentage}%)"


class QuizAttempt(models.Model):
    """Track quiz attempts by users"""
    
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('timed_out', 'Timed Out'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    time_taken_seconds = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.score}%"


class Answer(models.Model):
    """Store user answers for quiz questions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz_attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer_data = models.JSONField()
    is_correct = models.BooleanField(default=False)
    points_earned = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['quiz_attempt', 'question']
    
    def __str__(self):
        return f"Answer for {self.question} by {self.quiz_attempt.user.username}"


class Enrollment(models.Model):
    """Track user enrollments in career paths"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    career_path = models.ForeignKey(CareerPath, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    progress_percentage = models.IntegerField(default=0)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'career_path']
        ordering = ['-enrolled_at']
    
    def __str__(self):
        return f"{self.user.username} enrolled in {self.career_path.name}"


class ModuleProgress(models.Model):
    """Track user progress through modules"""
    
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='module_progress')
    module = models.ForeignKey(LearningModule, on_delete=models.CASCADE, related_name='user_progress')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='module_progress')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_minutes = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'module']
        ordering = ['module__order']
    
    def __str__(self):
        return f"{self.user.username} - {self.module.title} ({self.status})"


class Certificate(models.Model):
    """Certificates earned by users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    career_path = models.ForeignKey(CareerPath, on_delete=models.CASCADE)
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='certificate', null=True, blank=True)
    certificate_id = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf_url = models.URLField(blank=True, null=True)
    
    class Meta:
        unique_together = ['user', 'career_path']
    
    def __str__(self):
        return f"Certificate: {self.user.username} - {self.career_path.name}"
