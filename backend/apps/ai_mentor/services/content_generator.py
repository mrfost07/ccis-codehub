"""
AI Content Generation Service
Generates content for posts, projects, messages, etc.
"""

import json
import re
from typing import Dict, List, Any
from .ai_service import get_ai_response


class ContentGenerator:
    """Service for generating content using AI"""
    
    def __init__(self, user, model_type=None):
        self.user = user
        self.model_type = model_type
    
    def generate_post_content(self, topic: str, context: Dict = None) -> Dict[str, Any]:
        """
        Generate community post content
        
        Args:
            topic: What the post should be about
            context: Additional context (user progress, achievements, etc.)
        
        Returns:
            {
                'content': str,
                'hashtags': list
            }
        """
        
        # Get user's recent progress
        user_progress = self._get_user_progress()
        
        # Build context string
        context_info = ""
        if user_progress:
            context_info = f"\nUser's current progress:\n- Path: {user_progress.get('path_name', 'Not enrolled')}\n- Completed modules: {user_progress.get('completed_modules', 0)}"
        
        if context:
            context_info += f"\nAdditional context: {json.dumps(context)}"
        
        prompt = f"""Generate an engaging community post for a student on CCIS-CodeHub learning platform.

Topic: {topic}
{context_info}

Requirements:
- Write in first person (I, my, etc.)
- Be enthusiastic and positive
- Include relevant emojis (2-3 max)
- Mention specific achievements or learnings if applicable
- Keep it authentic and relatable
- Length: 100-200 words
- Professional but friendly tone

Also suggest 3-5 relevant hashtags.

Return JSON format:
{{
    "content": "The post content here...",
    "hashtags": ["WebDevelopment", "LearningJourney", "SNSU"]
}}"""

        try:
            response = get_ai_response(prompt, model_type=self.model_type)
            
            # Clean response
            response = response.strip()
            if response.startswith('```'):
                response = re.sub(r'^```json\s*', '', response)
                response = re.sub(r'^```\s*', '', response)
                response = re.sub(r'\s*```$', '', response)
            
            result = json.loads(response)
            
            return {
                'success': True,
                'content': result.get('content', ''),
                'hashtags': result.get('hashtags', [])
            }
            
        except Exception as e:
            # Fallback content
            return {
                'success': False,
                'content': f"Excited to share my progress on {topic}! 🚀\n\nLearning something new every day at CCIS-CodeHub. The journey continues! 💻✨",
                'hashtags': ['Learning', 'CCIS', 'Progress'],
                'error': str(e)
            }
    
    def generate_project_description(self, project_idea: str, tech_stack: List[str] = None) -> Dict[str, Any]:
        """
        Generate detailed project description
        
        Returns:
            {
                'title': str,
                'description': str,
                'features': list,
                'tech_stack': str
            }
        """
        
        tech_str = ', '.join(tech_stack) if tech_stack else 'appropriate technologies'
        
        prompt = f"""Generate a comprehensive project description for a student project.

Project Idea: {project_idea}
Tech Stack: {tech_str}

Generate:
1. A catchy project title (concise, descriptive)
2. A detailed description (2-3 paragraphs)
3. 5-7 key features
4. Suggested tech stack (if not provided)

Return JSON format:
{{
    "title": "Project Title",
    "description": "Detailed description...",
    "features": ["Feature 1", "Feature 2", ...],
    "tech_stack": "React, Node.js, MongoDB..."
}}"""

        try:
            response = get_ai_response(prompt, model_type=self.model_type)
            
            # Clean response
            response = response.strip()
            if response.startswith('```'):
                response = re.sub(r'^```json\s*', '', response)
                response = re.sub(r'^```\s*', '', response)
                response = re.sub(r'\s*```$', '', response)
            
            result = json.loads(response)
            
            return {
                'success': True,
                'title': result.get('title', project_idea),
                'description': result.get('description', ''),
                'features': result.get('features', []),
                'tech_stack': result.get('tech_stack', tech_str)
            }
            
        except Exception as e:
            # Fallback
            return {
                'success': False,
                'title': project_idea,
                'description': f"A project focused on {project_idea}. This will be built using modern technologies and best practices.",
                'features': ['Core functionality', 'User-friendly interface', 'Responsive design'],
                'tech_stack': tech_str,
                'error': str(e)
            }
    
    def generate_join_request_message(self, project_title: str, project_description: str = None) -> str:
        """Generate a professional join request message"""
        
        # Get user skills/interests
        user_info = self._get_user_info()
        
        prompt = f"""Generate a professional message requesting to join a project.

Project: {project_title}
Project Description: {project_description or 'Not provided'}
User: {user_info.get('name', 'Student')}
User's background: {user_info.get('program', 'BSCS/BSIT')} student at SNSU

Requirements:
- Professional but friendly tone
- Express genuine interest
- Mention relevant skills or interests
- Ask about ways to contribute
- Keep under 100 words

Generate the message (plain text, no JSON):"""

        try:
            message = get_ai_response(prompt, model_type=self.model_type)
            return message.strip()
            
        except Exception as e:
            # Fallback message
            return f"Hi! I'm interested in contributing to {project_title}. I'm a {user_info.get('program', 'CCIS')} student and would love to be part of this project. How can I help?"
    
    def _get_user_progress(self) -> Dict:
        """Get user's current learning progress"""
        try:
            from apps.learning.models import UserProgress
            
            progress = UserProgress.objects.filter(user=self.user).first()
            
            if not progress:
                return {}
            
            return {
                'path_name': progress.path.name,
                'completed_modules': progress.completed_modules,
                'total_modules': progress.path.modules.count() if hasattr(progress.path, 'modules') else 0,
                'status': progress.status
            }
        except Exception:
            return {}
    
    def _get_user_info(self) -> Dict:
        """Get user information"""
        return {
            'name': f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
            'username': self.user.username,
            'program': getattr(self.user, 'program', 'BSCS/BSIT'),
            'year_level': getattr(self.user, 'year_level', '')
        }
