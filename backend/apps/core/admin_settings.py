# Backend: Admin Interface
# apps/core/admin.py (add to existing file)

from django.contrib import admin
from .models_settings import AppSettings


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
