"""
Management command to populate default AI models
"""
from django.core.management.base import BaseCommand
from apps.ai_mentor.models_settings import AIModelConfig


class Command(BaseCommand):
    help = 'Populate default AI models'
    
    def handle(self, *args, **options):
        models_data = [
            {
                'name': 'gemini-1.5-flash',
                'display_name': 'Gemini 1.5 Flash',
                'provider': 'gemini',
                'model_id': 'gemini-1.5-flash',
                'description': 'Fast and efficient AI model by Google. Perfect for code assistance and learning.',
                'is_free': True,
                'status': 'active',
                'icon': '✨',
                'order': 1
            },
            {
                'name': 'gpt-4-turbo',
                'display_name': 'GPT-4 Turbo',
                'provider': 'openai',
                'model_id': 'gpt-4-turbo-preview',
                'description': 'Most advanced model from OpenAI with superior reasoning capabilities.',
                'is_free': False,
                'status': 'active',
                'icon': '🧠',
                'order': 2
            },
            {
                'name': 'gpt-3.5-turbo',
                'display_name': 'GPT-3.5 Turbo',
                'provider': 'openai',
                'model_id': 'gpt-3.5-turbo',
                'description': 'Fast and cost-effective model from OpenAI.',
                'is_free': False,
                'status': 'active',
                'icon': '💬',
                'order': 3
            },
            {
                'name': 'claude-3-opus',
                'display_name': 'Claude 3 Opus',
                'provider': 'anthropic',
                'model_id': 'claude-3-opus',
                'description': 'Most capable Claude model with excellent coding abilities.',
                'is_free': False,
                'status': 'coming_soon',
                'icon': '🎭',
                'order': 4
            },
            {
                'name': 'claude-3-sonnet',
                'display_name': 'Claude 3 Sonnet',
                'provider': 'anthropic',
                'model_id': 'claude-3-sonnet',
                'description': 'Balanced Claude model for everyday tasks.',
                'is_free': False,
                'status': 'coming_soon',
                'icon': '📝',
                'order': 5
            },
            {
                'name': 'command-r-plus',
                'display_name': 'Command R+',
                'provider': 'cohere',
                'model_id': 'command-r-plus',
                'description': 'Advanced RAG-optimized model from Cohere.',
                'is_free': False,
                'status': 'coming_soon',
                'icon': '🚀',
                'order': 6
            },
            {
                'name': 'mixtral-8x7b',
                'display_name': 'Mixtral 8x7B',
                'provider': 'huggingface',
                'model_id': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                'description': 'Open-source mixture of experts model.',
                'is_free': False,
                'status': 'coming_soon',
                'icon': '🤗',
                'order': 7
            },
            {
                'name': 'llama-3-70b',
                'display_name': 'Llama 3 70B',
                'provider': 'huggingface',
                'model_id': 'meta-llama/Llama-3-70b',
                'description': 'Large open-source model from Meta.',
                'is_free': False,
                'status': 'coming_soon',
                'icon': '🦙',
                'order': 8
            }
        ]
        
        for model_data in models_data:
            model, created = AIModelConfig.objects.update_or_create(
                name=model_data['name'],
                defaults=model_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created model: {model.display_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Updated model: {model.display_name}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully populated AI models'))
