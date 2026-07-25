"""
AI Model Settings and Configuration
"""
import uuid
from django.db import models
from django.conf import settings


class AIModelConfig(models.Model):
    """Configuration for AI models"""
    
    MODEL_PROVIDERS = [
        ('gemini', 'Google Gemini'),
        ('openai', 'OpenAI GPT'),
        ('anthropic', 'Anthropic Claude'),
        ('cohere', 'Cohere'),
        ('huggingface', 'HuggingFace'),
        ('custom', 'Custom Model'),
    ]
    
    MODEL_STATUS = [
        ('active', 'Active'),
        ('coming_soon', 'Coming Soon'),
        ('disabled', 'Disabled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=100)
    provider = models.CharField(max_length=20, choices=MODEL_PROVIDERS)
    model_id = models.CharField(max_length=100, help_text='Model ID like gpt-4, gemini-pro, etc.')
    description = models.TextField(blank=True)
    is_free = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=MODEL_STATUS, default='coming_soon')
    icon = models.CharField(max_length=10, default='🤖', help_text='Emoji or icon')
    order = models.IntegerField(default=0, help_text='Display order')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'name']
    
    def __str__(self):
        return f"{self.display_name} ({self.provider})"


class UserAISettings(models.Model):
    """User-specific AI settings and API keys"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='ai_settings'
    )
    selected_model = models.ForeignKey(
        AIModelConfig, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='users'
    )
    
    # User's own API keys ("bring your own key").
    # NOTE: these are the providers the platform actually has a service for —
    # gemini / openai / mistral / openrouter. anthropic, cohere and
    # huggingface are kept for forward compatibility but have no live backend
    # yet (see AIServiceFactory._services).
    gemini_api_key = models.CharField(max_length=200, blank=True)
    openai_api_key = models.CharField(max_length=200, blank=True)
    mistral_api_key = models.CharField(max_length=200, blank=True)
    openrouter_api_key = models.CharField(max_length=200, blank=True)
    anthropic_api_key = models.CharField(max_length=200, blank=True)
    cohere_api_key = models.CharField(max_length=200, blank=True)
    huggingface_api_key = models.CharField(max_length=200, blank=True)
    custom_api_keys = models.JSONField(default=dict, blank=True)

    # Preferences
    temperature = models.FloatField(default=0.7, help_text='0.0 to 1.0')
    max_tokens = models.IntegerField(default=2000)
    stream_responses = models.BooleanField(default=False)
    save_history = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # provider name -> field holding that provider's key
    PROVIDER_KEY_FIELDS = {
        'gemini': 'gemini_api_key',
        'openai': 'openai_api_key',
        'mistral': 'mistral_api_key',
        'openrouter': 'openrouter_api_key',
        'anthropic': 'anthropic_api_key',
        'cohere': 'cohere_api_key',
        'huggingface': 'huggingface_api_key',
    }

    def get_key_for(self, provider: str) -> str:
        """
        Return this user's own API key for `provider`, or '' if they haven't
        set one (in which case the caller should fall back to the server key).
        """
        field = self.PROVIDER_KEY_FIELDS.get((provider or '').lower())
        if not field:
            # Allow arbitrary providers via the custom_api_keys JSON bag
            return (self.custom_api_keys or {}).get(provider, '') or ''
        return (getattr(self, field, '') or '').strip()

    @property
    def configured_providers(self) -> list:
        """Providers this user has supplied their own key for."""
        return [p for p in self.PROVIDER_KEY_FIELDS if self.get_key_for(p)]

    def __str__(self):
        return f"AI Settings for {self.user.username}"


class CustomAIModel(models.Model):
    """User-defined custom AI models"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='custom_ai_models'
    )
    name = models.CharField(max_length=100)
    endpoint_url = models.URLField()
    api_key = models.CharField(max_length=500)
    headers = models.JSONField(default=dict, blank=True)
    request_format = models.JSONField(
        default=dict,
        help_text='Request body format with placeholders'
    )
    response_path = models.CharField(
        max_length=100,
        default='response',
        help_text='Path to response text in JSON'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} (Custom by {self.user.username})"
