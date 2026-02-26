"""
Learning Management System Models
"""
import uuid
import random
import string
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


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


# ==================== LIVE QUIZ MODELS ====================

def generate_join_code():
    """Generate unique 6-character alphanumeric join code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class LiveQuiz(models.Model):
    """Main quiz configuration for live, real-time assessments"""
    
    CREATION_METHODS = [
        ('pdf', 'PDF Upload'),
        ('ai_prompt', 'AI Generated'),
        ('manual', 'Manual Entry'),
    ]

    QUIZ_MODES = [
        ('live', 'Live (Host Required)'),
        ('self_paced', 'Self-Paced (Deadline)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='live_quizzes'
    )
    
    # Metadata
    title = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True)
    creation_method = models.CharField(max_length=20, choices=CREATION_METHODS, db_index=True)
    quiz_mode = models.CharField(max_length=20, choices=QUIZ_MODES, default='live', db_index=True)
    source_file = models.FileField(upload_to='live_quiz_sources/', null=True, blank=True)
    ai_prompt_text = models.TextField(blank=True)
    
    # Session configuration
    is_active = models.BooleanField(default=False, db_index=True)
    join_code = models.CharField(max_length=6, unique=True, db_index=True, default=generate_join_code)
    max_participants = models.IntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(500)]
    )
    
    # Quiz behavior settings
    auto_advance_questions = models.BooleanField(default=True)
    show_leaderboard = models.BooleanField(default=True)
    show_correct_answers = models.BooleanField(default=True)
    allow_late_join = models.BooleanField(default=False)
    shuffle_questions = models.BooleanField(default=False)
    shuffle_answers = models.BooleanField(default=True)
    
    # Anti-cheating configuration
    require_fullscreen = models.BooleanField(default=True)
    auto_pause_on_exit = models.BooleanField(default=True)
    max_violations = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    violation_penalty_points = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    # Anti-cheat action configuration (what to DO when a violation occurs)
    FULLSCREEN_EXIT_ACTIONS = [
        ('warn', 'Warn Only'),
        ('pause', 'Pause Quiz'),
        ('close', 'Close Session'),
    ]
    ALT_TAB_ACTIONS = [
        ('warn', 'Warn Only'),
        ('shuffle', 'Shuffle Question'),
        ('close', 'Close Session'),
    ]
    fullscreen_exit_action = models.CharField(
        max_length=10, choices=FULLSCREEN_EXIT_ACTIONS, default='warn'
    )
    alt_tab_action = models.CharField(
        max_length=10, choices=ALT_TAB_ACTIONS, default='warn'
    )

    # Feature toggles
    enable_ai_proctor = models.BooleanField(default=False)
    enable_code_execution = models.BooleanField(default=True)


    default_question_time = models.IntegerField(
        default=30,
        validators=[MinValueValidator(5), MaxValueValidator(300)]
    )
    break_between_questions = models.IntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(60)]
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Scheduling
    scheduled_start = models.DateTimeField(
        null=True, blank=True,
        help_text="When quiz becomes available (null = immediately)"
    )
    deadline = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text="When quiz closes (null = no deadline)"
    )
    
    # Retakes
    max_retakes = models.PositiveIntegerField(
        default=1,
        validators=[MaxValueValidator(10)],
        help_text="Max attempts per student (0 = unlimited)"
    )
    
    # Time limit for entire quiz
    time_limit_minutes = models.PositiveIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(480)],
        help_text="Total time to complete quiz (null = no limit)"
    )
    
    class Meta:
        db_table = 'live_quiz'
        indexes = [
            models.Index(fields=['instructor', '-created_at']),
            models.Index(fields=['is_active', 'started_at']),
            models.Index(fields=['deadline']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.join_code})"
    
    def is_open(self):
        """Check if quiz is currently accessible based on schedule"""
        now = timezone.now()
        if self.scheduled_start and now < self.scheduled_start:
            return False
        if self.deadline and now > self.deadline:
            return False
        return True
    
    def get_status_text(self):
        """Get human-readable status"""
        now = timezone.now()
        if self.scheduled_start and now < self.scheduled_start:
            return f"Opens {self.scheduled_start.strftime('%b %d, %I:%M %p')}"
        if self.deadline and now > self.deadline:
            return "Closed"
        if self.is_active:
            return "Active"
        return "Ready"
    
    def get_student_attempts(self, student):
        """Count student's completed attempts"""
        return LiveQuizParticipant.objects.filter(
            session__quiz=self,
            student=student,
            left_at__isnull=False
        ).count()
    
    def can_student_attempt(self, student):
        """Check if student can make another attempt"""
        now = timezone.now()
        if self.scheduled_start and now < self.scheduled_start:
            return False, f"Opens {self.scheduled_start.strftime('%b %d at %I:%M %p')}"
        if self.deadline and now > self.deadline:
            return False, "Deadline has passed"
        if self.max_retakes == 0:
            return True, "Unlimited attempts"
        attempts = self.get_student_attempts(student)
        if attempts >= self.max_retakes:
            return False, f"Max attempts ({self.max_retakes}) reached"
        remaining = self.max_retakes - attempts
        return True, f"{remaining} attempt{'s' if remaining > 1 else ''} remaining"


class LiveQuizQuestion(models.Model):
    """Individual quiz question supporting MCQ, True/False, Short Answer, and Coding"""
    
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
        ('coding', 'Coding Challenge'),
    ]
    
    PROGRAMMING_LANGUAGES = [
        ('python', 'Python 3'),
        ('javascript', 'JavaScript (Node.js)'),
        ('java', 'Java'),
        ('cpp', 'C++'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(LiveQuiz, on_delete=models.CASCADE, related_name='live_questions')
    
    # Question content
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, db_index=True)
    order = models.IntegerField(db_index=True)
    
    # Media attachments
    image_url = models.URLField(max_length=500, blank=True)
    
    # Multiple choice options
    option_a = models.CharField(max_length=500, blank=True)
    option_b = models.CharField(max_length=500, blank=True)
    option_c = models.CharField(max_length=500, blank=True)
    option_d = models.CharField(max_length=500, blank=True)
    correct_answer = models.CharField(max_length=500)
    explanation = models.TextField(blank=True)
    
    # Coding question fields
    programming_language = models.CharField(max_length=50, blank=True, choices=PROGRAMMING_LANGUAGES)
    starter_code = models.TextField(blank=True)
    test_cases = models.JSONField(default=list, blank=True)
    solution_code = models.TextField(blank=True)
    
    # Scoring configuration
    points = models.IntegerField(default=100, validators=[MinValueValidator(1), MaxValueValidator(1000)])
    time_limit = models.IntegerField(default=30, validators=[MinValueValidator(5), MaxValueValidator(300)])
    time_bonus_enabled = models.BooleanField(default=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'live_quiz_question'
        unique_together = [['quiz', 'order']]
        indexes = [
            models.Index(fields=['quiz', 'order']),
        ]
        ordering = ['order']
    
    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}"


class LiveQuizSession(models.Model):
    """Active quiz session - one per quiz, created when quiz starts"""
    
    SESSION_STATUSES = [
        ('lobby', 'Waiting to Start'),
        ('in_progress', 'Active'),
        ('paused', 'Paused'),
        ('ended', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.OneToOneField(LiveQuiz, on_delete=models.CASCADE, related_name='session')
    
    # Session state
    status = models.CharField(max_length=20, choices=SESSION_STATUSES, default='lobby', db_index=True)
    
    # Current question tracking
    current_question = models.ForeignKey(
        LiveQuizQuestion,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='active_sessions'
    )
    current_question_started_at = models.DateTimeField(null=True, blank=True)
    
    # Real-time statistics
    total_participants = models.IntegerField(default=0)
    active_participants = models.IntegerField(default=0)
    total_questions_shown = models.IntegerField(default=0)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'live_quiz_session'
        indexes = [
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"Session: {self.quiz.title} ({self.status})"


class LiveQuizParticipant(models.Model):
    """Student participant in a live quiz session with comprehensive tracking"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LiveQuizSession, on_delete=models.CASCADE, related_name='participants')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='live_quiz_participations')
    nickname = models.CharField(max_length=50)
    
    # Scoring metrics
    total_score = models.IntegerField(default=0, db_index=True)
    total_correct = models.IntegerField(default=0)
    total_attempted = models.IntegerField(default=0)
    average_response_time = models.FloatField(default=0)
    rank = models.IntegerField(null=True, blank=True, db_index=True)
    
    # Anti-cheating telemetry
    fullscreen_violations = models.IntegerField(default=0)
    tab_switch_count = models.IntegerField(default=0)
    copy_paste_attempts = models.IntegerField(default=0)
    is_flagged = models.BooleanField(default=False, db_index=True)
    
    # State management
    is_paused = models.BooleanField(default=False)
    pause_reason = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Connection tracking
    websocket_id = models.CharField(max_length=100, blank=True)
    last_seen = models.DateTimeField(auto_now=True, db_index=True)
    
    # Audit
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'live_quiz_participant'
        unique_together = [['session', 'student']]
        indexes = [
            models.Index(fields=['session', '-total_score']),
            models.Index(fields=['session', 'is_active']),
        ]
        ordering = ['-total_score', 'average_response_time']
    
    def __str__(self):
        return f"{self.nickname} ({self.total_score} pts)"


class LiveQuizResponse(models.Model):
    """Student answer submission for a specific question"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant = models.ForeignKey(LiveQuizParticipant, on_delete=models.CASCADE, related_name='live_responses')
    question = models.ForeignKey(LiveQuizQuestion, on_delete=models.CASCADE, related_name='live_responses')
    
    # Answer data
    answer_text = models.CharField(max_length=500, blank=True)
    code_submission = models.TextField(blank=True)
    test_results = models.JSONField(default=dict, blank=True)
    
    # Evaluation
    is_correct = models.BooleanField()
    points_earned = models.IntegerField(default=0)
    response_time_seconds = models.FloatField()
    
    # Metadata
    answered_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'live_quiz_response'
        unique_together = [['participant', 'question']]
        indexes = [
            models.Index(fields=['participant', 'answered_at']),
            models.Index(fields=['question', 'is_correct']),
        ]
    
    def __str__(self):
        return f"{self.participant.nickname} - Q{self.question.order}"
