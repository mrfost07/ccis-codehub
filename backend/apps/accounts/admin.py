"""
Admin configuration for accounts app
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, AppSettings


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    """Admin interface for app settings"""
    
    list_display = [
        'enable_user_delete',
        'enable_analytics', 
        'enable_ai_mentor',
        'enable_projects',
        'enable_community',
        'updated_at',
        'updated_by'
    ]
    
    fieldsets = (
        ('Core Features', {
            'fields': (
                'enable_ai_mentor',
                'enable_code_editor',
                'enable_learning_paths',
            )
        }),
        ('Platform Features', {
            'fields': (
                'enable_projects',
                'enable_competitions',
                'enable_community',
            )
        }),
        ('Admin Features', {
            'fields': (
                'enable_analytics',
                'enable_user_delete',
            ),
            'description': 'These features are only available to administrators'
        }),
    )
    
    readonly_fields = ['updated_at', 'updated_by']
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        return not AppSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of settings
        return False
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)



@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for User model"""
    list_display = ['email', 'username', 'role', 'is_active', 'is_staff', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'created_at']
    search_fields = ['email', 'username']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('username', 'profile_picture', 'bio', 'skills')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
        ('Firebase', {'fields': ('firebase_uid',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'role'),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin interface for UserProfile model"""
    list_display = ['user', 'github_username', 'location', 'total_modules_completed']
    search_fields = ['user__email', 'user__username', 'github_username']
