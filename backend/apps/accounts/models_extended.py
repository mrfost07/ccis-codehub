"""
Extended models for User Management - Skill and CareerInterest
These models should be added to the accounts app to match the UML diagram
"""
import uuid
from django.db import models
from django.conf import settings


class Skill(models.Model):
    """Skills that users can have"""
    
    CATEGORY_CHOICES = [
        ('programming', 'Programming'),
        ('web_development', 'Web Development'),
        ('mobile_development', 'Mobile Development'),
        ('database', 'Database'),
        ('design', 'Design'),
        ('devops', 'DevOps'),
        ('security', 'Security'),
        ('data_science', 'Data Science'),
        ('ai_ml', 'AI/Machine Learning'),
        ('cloud', 'Cloud Computing'),
        ('networking', 'Networking'),
        ('testing', 'Testing'),
        ('project_management', 'Project Management'),
        ('soft_skills', 'Soft Skills'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'skills'
        ordering = ['category', 'name']
        verbose_name = 'Skill'
        verbose_name_plural = 'Skills'
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class CareerInterest(models.Model):
    """Career interests that users can have"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'career_interests'
        ordering = ['name']
        verbose_name = 'Career Interest'
        verbose_name_plural = 'Career Interests'
    
    def __str__(self):
        return self.name


class UserSkill(models.Model):
    """Many-to-many relationship between User and Skill with proficiency level"""
    
    PROFICIENCY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('expert', 'Expert'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='skilled_users')
    proficiency = models.CharField(max_length=20, choices=PROFICIENCY_CHOICES, default='beginner')
    years_of_experience = models.DecimalField(max_digits=4, decimal_places=1, default=0, help_text='Years of experience with this skill')
    is_primary = models.BooleanField(default=False, help_text='Is this a primary skill?')
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_skills'
        unique_together = ['user', 'skill']
        ordering = ['-is_primary', '-proficiency', 'skill__name']
        verbose_name = 'User Skill'
        verbose_name_plural = 'User Skills'
    
    def __str__(self):
        return f"{self.user.username} - {self.skill.name} ({self.get_proficiency_display()})"


class UserCareerInterest(models.Model):
    """Many-to-many relationship between User and CareerInterest"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_career_interests')
    career_interest = models.ForeignKey(CareerInterest, on_delete=models.CASCADE, related_name='interested_users')
    priority = models.IntegerField(default=0, help_text='Priority level (higher = more interested)')
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_career_interests'
        unique_together = ['user', 'career_interest']
        ordering = ['-priority', 'career_interest__name']
        verbose_name = 'User Career Interest'
        verbose_name_plural = 'User Career Interests'
    
    def __str__(self):
        return f"{self.user.username} - {self.career_interest.name}"
