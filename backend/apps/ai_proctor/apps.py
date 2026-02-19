"""
AI Proctor Django App config
"""
from django.apps import AppConfig


class AiProctoringConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_proctor'
    label = 'ai_proctor'
    verbose_name = 'AI Proctoring'
