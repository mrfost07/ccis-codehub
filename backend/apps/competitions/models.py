"""
Coding Competitions and Challenges Models
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Competition(models.Model):
    """Coding competitions"""
    
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('expert', 'Expert'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    rules = models.TextField()
    prize_description = models.TextField(blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='upcoming')
    max_participants = models.IntegerField(default=100)
    current_participants = models.IntegerField(default=0)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    registration_deadline = models.DateTimeField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_competitions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_time']
    
    def is_registration_open(self):
        now = timezone.now()
        return now < self.registration_deadline and self.current_participants < self.max_participants
    
    def __str__(self):
        return self.title


class Challenge(models.Model):
    """Individual challenges within competitions"""
    
    CHALLENGE_TYPE_CHOICES = [
        ('algorithm', 'Algorithm'),
        ('data_structure', 'Data Structure'),
        ('debugging', 'Debugging'),
        ('optimization', 'Optimization'),
        ('system_design', 'System Design'),
        ('frontend', 'Frontend'),
        ('backend', 'Backend'),
        ('fullstack', 'Full Stack'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='challenges')
    title = models.CharField(max_length=255)
    problem_statement = models.TextField()
    challenge_type = models.CharField(max_length=20, choices=CHALLENGE_TYPE_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    points = models.IntegerField(default=100)
    time_limit = models.IntegerField(help_text='Time limit in minutes')
    memory_limit = models.IntegerField(help_text='Memory limit in MB')
    input_format = models.TextField()
    output_format = models.TextField()
    constraints = models.TextField()
    sample_input = models.TextField()
    sample_output = models.TextField()
    explanation = models.TextField(blank=True)
    hidden_test_cases = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['competition', 'points']
    
    def __str__(self):
        return f"{self.title} - {self.competition.title}"


class CompetitionRegistration(models.Model):
    """User registrations for competitions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='registrations')
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='competition_registrations')
    registered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['competition', 'participant']
        ordering = ['registered_at']
    
    def __str__(self):
        return f"{self.participant.username} - {self.competition.title}"


class Submission(models.Model):
    """Code submissions for challenges"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('accepted', 'Accepted'),
        ('wrong_answer', 'Wrong Answer'),
        ('time_limit', 'Time Limit Exceeded'),
        ('memory_limit', 'Memory Limit Exceeded'),
        ('runtime_error', 'Runtime Error'),
        ('compile_error', 'Compilation Error'),
    ]
    
    LANGUAGE_CHOICES = [
        ('python', 'Python'),
        ('javascript', 'JavaScript'),
        ('java', 'Java'),
        ('cpp', 'C++'),
        ('c', 'C'),
        ('csharp', 'C#'),
        ('go', 'Go'),
        ('rust', 'Rust'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='submissions')
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='challenge_submissions')
    code = models.TextField()
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    execution_time = models.IntegerField(default=0, help_text='In milliseconds')
    memory_used = models.IntegerField(default=0, help_text='In KB')
    test_cases_passed = models.IntegerField(default=0)
    total_test_cases = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.participant.username} - {self.challenge.title} - {self.status}"


class Leaderboard(models.Model):
    """Competition leaderboards"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='leaderboard_entries')
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leaderboard_entries')
    total_score = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    challenges_solved = models.IntegerField(default=0)
    total_time = models.IntegerField(default=0, help_text='Total time in minutes')
    rank = models.IntegerField(default=0)
    last_submission = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['competition', 'participant']
        ordering = ['-total_score', 'total_time']
    
    def __str__(self):
        return f"{self.participant.username} - Rank {self.rank} - {self.competition.title}"


class Achievement(models.Model):
    """Competition achievements"""
    
    ACHIEVEMENT_TYPE_CHOICES = [
        ('first_solve', 'First to Solve'),
        ('fastest_solve', 'Fastest Solution'),
        ('most_efficient', 'Most Efficient'),
        ('perfect_score', 'Perfect Score'),
        ('participation', 'Participation'),
        ('winner', 'Competition Winner'),
        ('runner_up', 'Runner Up'),
        ('top_10', 'Top 10 Finish'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='competition_achievements')
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, null=True, blank=True)
    achievement_type = models.CharField(max_length=20, choices=ACHIEVEMENT_TYPE_CHOICES)
    description = models.TextField()
    points_awarded = models.IntegerField(default=0)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-earned_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.achievement_type} - {self.competition.title}"


class TestCase(models.Model):
    """Test cases for challenges"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='test_cases')
    input_data = models.TextField()
    expected_output = models.TextField()
    is_hidden = models.BooleanField(default=True)
    points = models.IntegerField(default=10)
    time_limit = models.IntegerField(help_text='Time limit in seconds')
    memory_limit = models.IntegerField(help_text='Memory limit in MB')
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['challenge', 'order']
    
    def __str__(self):
        return f"Test Case {self.order} for {self.challenge.title}"
