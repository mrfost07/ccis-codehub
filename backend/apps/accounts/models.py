"""
User and Profile models
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    """Manager for custom user model"""
    
    def create_user(self, email, password=None, username=None, **extra_fields):
        """Create and save a new user"""
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            # Generate username from email if not provided
            username = email.split('@')[0]
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password, username=None, **extra_fields):
        """Create and save a new superuser"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, username, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model that uses email instead of username"""
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('instructor', 'Instructor'),
        ('student', 'Student'),
    ]
    
    PROGRAM_CHOICES = [
        ('BSIT', 'BS Information Technology'),
        ('BSCS', 'BS Computer Science'),
        ('BSIS', 'BS Information Systems'),
    ]
    
    YEAR_CHOICES = [
        ('1', '1st Year'),
        ('2', '2nd Year'),
        ('3', '3rd Year'),
        ('4', '4th Year'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)
    google_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    email = models.EmailField(max_length=255, unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    
    # Academic Information
    program = models.CharField(max_length=10, choices=PROGRAM_CHOICES, default='BSIT')
    year_level = models.CharField(max_length=1, choices=YEAR_CHOICES, default='1')
    
    # Profile fields
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    skills = models.JSONField(default=list, blank=True)
    career_interests = models.JSONField(default=list, blank=True)
    
    # Social
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)
    
    # Profile picture
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """Extended user profile information"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    github_username = models.CharField(max_length=100, blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    
    # Statistics
    total_courses_completed = models.IntegerField(default=0)
    total_modules_completed = models.IntegerField(default=0)
    total_projects = models.IntegerField(default=0)
    total_posts = models.IntegerField(default=0)
    total_likes_received = models.IntegerField(default=0)
    total_comments = models.IntegerField(default=0)
    contribution_points = models.IntegerField(default=0)
    
    # Learning Progress
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    certificates_earned = models.IntegerField(default=0)
    
    # Preferences
    theme_preference = models.CharField(max_length=20, default='dark', choices=[
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ])
    profile_background = models.CharField(max_length=20, default='gradient', choices=[
        ('hyperspeed', 'Hyperspeed'),
        ('akira', 'Akira'),
        ('golden', 'Golden'),
        ('split', 'Split'),
        ('highway', 'Highway'),
        ('gradient', 'Classic'),
        ('aurora', 'Aurora'),
        ('cyber', 'Cyber'),
    ])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"{self.user.email} - Profile"
