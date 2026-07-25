"""
Serializers for AI Settings
"""
from rest_framework import serializers
from .models_settings import AIModelConfig, UserAISettings, CustomAIModel


class AIModelConfigSerializer(serializers.ModelSerializer):
    """Serializer for AI Model Configuration"""
    
    class Meta:
        model = AIModelConfig
        fields = [
            'id', 'name', 'display_name', 'provider', 'model_id',
            'description', 'is_free', 'status', 'icon', 'order'
        ]


# Module level: a comprehension inside `class Meta` cannot see attributes of
# the enclosing class body, so this must live out here.
API_KEY_FIELDS = [
    'gemini_api_key', 'openai_api_key', 'mistral_api_key', 'openrouter_api_key',
    'anthropic_api_key', 'cohere_api_key', 'huggingface_api_key',
]


class UserAISettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for User AI Settings.

    API keys are write-only — they are never sent back to the client. Instead
    `keys` reports, per provider, whether a key is saved and a masked preview
    so the UI can render "configured" state without ever handling the secret.
    """
    selected_model = AIModelConfigSerializer(read_only=True)
    selected_model_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    keys = serializers.SerializerMethodField()

    KEY_FIELDS = API_KEY_FIELDS

    class Meta:
        model = UserAISettings
        fields = [
            'id', 'selected_model', 'selected_model_id', 'keys',
            'gemini_api_key', 'openai_api_key', 'mistral_api_key', 'openrouter_api_key',
            'anthropic_api_key', 'cohere_api_key', 'huggingface_api_key',
            'custom_api_keys',
            'temperature', 'max_tokens', 'stream_responses', 'save_history'
        ]
        extra_kwargs = {
            field: {'write_only': True, 'required': False, 'allow_blank': True}
            for field in API_KEY_FIELDS
        }

    def get_keys(self, obj):
        """Per-provider {configured, preview} — never the raw key."""
        out = {}
        for provider, field in UserAISettings.PROVIDER_KEY_FIELDS.items():
            raw = (getattr(obj, field, '') or '').strip()
            out[provider] = {
                'configured': bool(raw),
                # Show only the last 4 chars so a user can tell keys apart.
                'preview': f'••••{raw[-4:]}' if len(raw) >= 4 else ('••••' if raw else ''),
            }
        return out

    def validate(self, attrs):
        """Reject obviously malformed keys early with a clear message."""
        for field in self.KEY_FIELDS:
            if field not in attrs:
                continue
            value = (attrs[field] or '').strip()
            attrs[field] = value
            if value and len(value) < 8:
                raise serializers.ValidationError(
                    {field: 'That key looks too short — please paste the full API key.'}
                )
        return attrs

    def update(self, instance, validated_data):
        if 'selected_model_id' in validated_data:
            model_id = validated_data.pop('selected_model_id')
            if model_id is None:
                instance.selected_model = None
            else:
                try:
                    instance.selected_model = AIModelConfig.objects.get(id=model_id)
                except AIModelConfig.DoesNotExist:
                    raise serializers.ValidationError(
                        {'selected_model_id': 'Unknown model.'}
                    )

        return super().update(instance, validated_data)


class CustomAIModelSerializer(serializers.ModelSerializer):
    """Serializer for Custom AI Models"""
    
    class Meta:
        model = CustomAIModel
        fields = [
            'id', 'name', 'endpoint_url', 'api_key', 'headers',
            'request_format', 'response_path', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'api_key': {'write_only': True}
        }
