"""
Updated User model to match UML class diagram specification
This file shows what the User model SHOULD look like according to the UML

INSTRUCTIONS:
1. Backup current models.py
2. Review changes carefully
3. Create migrations
4. Handle data migration from old structure
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
    """
    Custom user model that matches UML class diagram specification
    
    This model includes all fields specified in the UML diagram:
    - All authentication fields
    - Profile fields  
    - Academic information
    - Social profile links
    - Gamification (points, level)
    - Verification status
    """
    
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
    
    # ============================================================================
    # PRIMARY IDENTIFICATION FIELDS (from UML)
    # ============================================================================
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    username = models.CharField(max_length=150, unique=True)
    # password_hash is handled by AbstractBaseUser
    
    # ============================================================================
    # PERSONAL INFORMATION FIELDS (from UML)
    # ============================================================================
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='profile_pictures/', blank=True, null=True, 
                               help_text='User profile picture/avatar')
    
    # ============================================================================
    # ACADEMIC INFORMATION FIELDS (from UML)
    # ============================================================================
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    program = models.CharField(max_length=10, choices=PROGRAM_CHOICES, default='BSIT')
    year_level = models.IntegerField(default=1, choices=[(1, '1st Year'), (2, '2nd Year'), 
                                                          (3, '3rd Year'), (4, '4th Year')])
    student_id = models.CharField(max_length=50, unique=True, null=True, blank=True,
                                  help_text='Official student ID number (e.g., 2024-00001)')
    
    # ============================================================================
    # SOCIAL PROFILE LINKS (from UML)
    # ============================================================================
    github_username = models.CharField(max_length=100, blank=True, null=True,
                                       help_text='GitHub username (without @)')
    linkedin_url = models.URLField(blank=True, null=True,
                                   help_text='Full LinkedIn profile URL')
    portfolio_url = models.URLField(blank=True, null=True,
                                    help_text='Personal website or portfolio URL')
    
    # ============================================================================
    # GAMIFICATION FIELDS (from UML)
    # ============================================================================
    points = models.IntegerField(default=0,
                                 help_text='Total points earned by user')
    level = models.IntegerField(default=1,
                                help_text='User level based on points')
    
    # ============================================================================
    # RELATIONSHIPS (from UML - using ManyToMany through models)
    # ============================================================================
    # has_skills: User "1" --> "*" Skill
    skills = models.ManyToManyField('Skill', through='UserSkill', 
                                    related_name='users_with_skill', blank=True)
    
    # has_interests: User "1" --> "*" CareerInterest  
    career_interests = models.ManyToManyField('CareerInterest', through='UserCareerInterest',
                                              related_name='users_interested', blank=True)
    
    # earned_badges: User "1" --> "*" Badge (handled by UserBadge in community app)
    # following/followers: User "1" --> "*" UserFollow (handled in community app)
    
    # ============================================================================
    # STATUS AND VERIFICATION FIELDS (from UML)
    # ============================================================================
    is_verified = models.BooleanField(default=False,
                                      help_text='Email/account verification status')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # ============================================================================
    # TIMESTAMP FIELDS (from UML)
    # ============================================================================
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # ============================================================================
    # ADDITIONAL FIELDS (for Firebase integration - not in UML but useful)
    # ============================================================================
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True)
    
    # ============================================================================
    # COMPUTED FIELDS (can be calculated from relationships)
    # ============================================================================
    # These could be properties instead of database fields for data consistency
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.email})"
    
    # ============================================================================
    # METHODS (from UML)
    # ============================================================================
    
    def earn_points(self, points):
        """
        Award points to user and check for level up
        
        Args:
            points (int): Number of points to award
            
        Returns:
            bool: True if user leveled up, False otherwise
        """
        self.points += points
        leveled_up = self.check_level_up()
        self.save()
        
        # Create notification for level up
        if leveled_up:
            from apps.community.models import Notification
            Notification.objects.create(
                recipient=self,
                notification_type='badge_earned',
                title=f'Level Up! You are now Level {self.level}',
                message=f'Congratulations! You have reached level {self.level} with {self.points} points.'
            )
        
        return leveled_up
    
    def check_level_up(self):
        """
        Check if user should level up based on points
        
        Level formula: level = (points // 100) + 1
        Every 100 points = 1 level
        
        Returns:
            bool: True if user leveled up, False otherwise
        """
        new_level = (self.points // 100) + 1
        if new_level > self.level:
            old_level = self.level
            self.level = new_level
            return True
        return False
    
    def follow_user(self, user_to_follow):
        """
        Follow another user
        
        Args:
            user_to_follow (User): User to follow
            
        Returns:
            UserFollow: The created follow relationship or existing one
        """
        if self == user_to_follow:
            raise ValueError("Cannot follow yourself")
        
        from apps.community.models import UserFollow, Notification
        
        follow, created = UserFollow.objects.get_or_create(
            follower=self,
            following=user_to_follow
        )
        
        if created:
            # Update counts
            self.following_count += 1
            user_to_follow.followers_count += 1
            self.save(update_fields=['following_count'])
            user_to_follow.save(update_fields=['followers_count'])
            
            # Create notification
            Notification.objects.create(
                recipient=user_to_follow,
                sender=self,
                notification_type='follow',
                title=f'{self.username} started following you',
                message=f'{self.username} is now following you!'
            )
        
        return follow
    
    def unfollow_user(self, user_to_unfollow):
        """
        Unfollow a user
        
        Args:
            user_to_unfollow (User): User to unfollow
            
        Returns:
            bool: True if unfollowed successfully, False if not following
        """
        from apps.community.models import UserFollow
        
        deleted_count, _ = UserFollow.objects.filter(
            follower=self,
            following=user_to_unfollow
        ).delete()
        
        if deleted_count > 0:
            # Update counts
            self.following_count = max(0, self.following_count - 1)
            user_to_unfollow.followers_count = max(0, user_to_unfollow.followers_count - 1)
            self.save(update_fields=['following_count'])
            user_to_unfollow.save(update_fields=['followers_count'])
            return True
        
        return False
    
    def update_profile(self, **kwargs):
        """
        Update user profile fields
        
        Args:
            **kwargs: Field names and values to update
            
        Returns:
            User: Updated user instance
        """
        allowed_fields = [
            'first_name', 'last_name', 'bio', 'avatar', 
            'github_username', 'linkedin_url', 'portfolio_url',
            'program', 'year_level', 'student_id'
        ]
        
        for key, value in kwargs.items():
            if key in allowed_fields and hasattr(self, key):
                setattr(self, key, value)
        
        self.save()
        return self
    
    # ============================================================================
    # ADDITIONAL HELPER METHODS
    # ============================================================================
    
    @property
    def full_name(self):
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username
    
    @property
    def progress_to_next_level(self):
        """Calculate progress percentage to next level"""
        points_in_current_level = self.points % 100
        return (points_in_current_level / 100) * 100
    
    @property
    def points_to_next_level(self):
        """Calculate points needed for next level"""
        return 100 - (self.points % 100)
    
    def get_skill_list(self):
        """Get list of user's skills with proficiency"""
        return self.user_skills.select_related('skill').all()
    
    def get_career_interests_list(self):
        """Get list of user's career interests"""
        return self.user_career_interests.select_related('career_interest').all()
    
    def has_skill(self, skill_name):
        """Check if user has a specific skill"""
        return self.skills.filter(name__iexact=skill_name).exists()
    
    def has_career_interest(self, interest_name):
        """Check if user has a specific career interest"""
        return self.career_interests.filter(name__iexact=interest_name).exists()


# ============================================================================
# USER PROFILE MODEL (OPTIONAL - for extended statistics)
# ============================================================================
# This model can remain for backward compatibility and additional stats
# that are not part of the core UML User model

class UserProfile(models.Model):
    """Extended user profile information and statistics"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    location = models.CharField(max_length=255, blank=True, null=True)
    
    # Statistics (calculated fields)
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"{self.user.email} - Profile"
