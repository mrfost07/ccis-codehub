# Backend: App Settings Model
# apps/core/models.py

from django.db import models
from django.core.cache import cache


class AppSettings(models.Model):
    """
    Application-wide settings that can be changed at runtime
    without rebuilding the frontend
    """
    
    # Feature Flags
    enable_ai_mentor = models.BooleanField(default=True, help_text="Enable AI Mentor feature")
    enable_code_editor = models.BooleanField(default=True, help_text="Enable code editor")
    enable_competitions = models.BooleanField(default=True, help_text="Enable competitions")
    enable_projects = models.BooleanField(default=True, help_text="Enable projects")
    enable_community = models.BooleanField(default=True, help_text="Enable community features")
    enable_learning_paths = models.BooleanField(default=True, help_text="Enable learning paths")
    enable_analytics = models.BooleanField(default=False, help_text="Enable analytics (admin only)")
    enable_user_delete = models.BooleanField(default=False, help_text="Allow admins to delete users")
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='settings_updates'
    )
    
    class Meta:
        verbose_name = "App Settings"
        verbose_name_plural = "App Settings"
    
    def __str__(self):
        return f"App Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one settings instance exists (singleton)
        self.pk = 1
        super().save(*args, **kwargs)
        # Clear cache when settings change
        cache.delete('app_settings')
    
    @classmethod
    def get_settings(cls):
        """Get or create singleton settings instance with caching"""
        settings = cache.get('app_settings')
        if settings is None:
            settings, _ = cls.objects.get_or_create(pk=1)
            cache.set('app_settings', settings, 300)  # Cache for 5 minutes
        return settings
    
    @classmethod
    def get_features_dict(cls, user=None):
        """Get features as dict, filtered by user permissions"""
        settings = cls.get_settings()
        
        features = {
            'ai_mentor': settings.enable_ai_mentor,
            'code_editor': settings.enable_code_editor,
            'competitions': settings.enable_competitions,
            'projects': settings.enable_projects,
            'community': settings.enable_community,
            'learning_paths': settings.enable_learning_paths,
        }
        
        # Admin-only features
        if user and user.is_staff:
            features['analytics'] = settings.enable_analytics
            features['user_delete'] = settings.enable_user_delete
        else:
            features['analytics'] = False
            features['user_delete'] = False
        
        return features
