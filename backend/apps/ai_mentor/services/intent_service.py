"""
AI Intent Classification Service
Analyzes user messages to determine intent and extract parameters
"""

import json
import re
from typing import Dict, List, Any
from .ai_service import get_ai_response


class IntentType:
    """Available intent types"""
    SEARCH = "search"
    ENROLL = "enroll"
    UNENROLL = "unenroll"
    CREATE_PROJECT = "create_project"
    CREATE_POST = "create_post"
    JOIN_PROJECT = "join_project"
    NAVIGATE = "navigate"
    GENERAL_QUESTION = "general_question"
    # New intents
    VIEW_PROGRESS = "view_progress"
    VIEW_MY_PROJECTS = "view_my_projects"
    FOLLOW_USER = "follow_user"
    UNFOLLOW_USER = "unfollow_user"
    SEND_MESSAGE = "send_message"
    VIEW_USER_PROFILE = "view_user_profile"
    COMMENT_ON_POST = "comment_on_post"
    LIKE_POST = "like_post"


def classify_intent(message: str, context: List[Dict] = None, model_type: str = None) -> Dict[str, Any]:
    """
    Classify user intent using AI
    
    Args:
        message: User's message
        context: Conversation history
        model_type: AI model to use (default: env default or openrouter)
    
    Returns:
        {
            "intent": IntentType,
            "confidence": float,
            "parameters": dict,
            "requires_confirmation": bool
        }
    """
    
    # Build context string
    context_str = ""
    if context:
        recent = context[-3:] if len(context) > 3 else context
        context_str = "\nRecent conversation:\n"
        for msg in recent:
            context_str += f"{msg['sender']}: {msg['message']}\n"
    
    # AI classification prompt
    prompt = f"""Analyze this user message and determine their intent.

{context_str}
Current message: "{message}"

Available intents:
1. search - User wants to find courses, projects, or content
   Examples: "find React courses", "search for Python", "show me projects"
   
2. enroll - User wants to enroll in a course/path
   Examples: "enroll me", "I want to join", "sign me up for this course"
   NOT: "tell me about courses", "what courses are available"
   
3. unenroll - User wants to leave/unenroll from a course
   Examples: "unenroll me", "leave this course", "drop this class"
   
4. create_project - User wants to create a new project
   Examples: "create a project", "make a todo app", "start a new project", "build a calculator"
   NOT: "help", "what can I do", "show me around", "need assistance", "tell me about projects"
   
5. create_post - User wants to create a community post
   Examples: "write a post", "share my progress", "create post about"
   NOT: "show me posts", "what's new in community"
   
6. join_project - User wants to join/contribute to existing project
   Examples: "join this project", "I want to contribute", "find projects to join"
   
7. navigate - User wants to go to a specific page
   Examples: "go to learning", "open projects page", "show my profile"
   
8. view_progress - User wants to see their enrolled courses and progress
   Examples: "show my progress", "my enrolled courses", "what am I learning"
   
9. view_my_projects - User wants to see their projects
   Examples: "show my projects", "my projects", "projects I'm working on"
   
10. follow_user - User wants to follow someone
    Examples: "follow @username", "follow John", "I want to follow this user"
    
11. unfollow_user - User wants to unfollow someone
    Examples: "unfollow @username", "stop following John"
    
12. send_message - User wants to message someone
    Examples: "message @username", "send a message to John", "chat with @user"
    
13. view_user_profile - User wants to view someone's profile
    Examples: "show @username's profile", "view John's profile", "who is @user"
    
14. comment_on_post - User wants to comment on a post
    Examples: "comment on this post", "add a comment", "reply to this"
    
15. like_post - User wants to like a post
    Examples: "like this post", "give a like", "heart this"
   
16. general_question - Just asking a question or having conversation
    Examples: "what is React?", "how does this work?", "explain hooks", "help", "what can you do"

IMPORTANT CLASSIFICATION RULES:
- Only classify as CREATE_PROJECT if user EXPLICITLY mentions creating, making, or building something specific
- Only classify as ENROLL if user EXPLICITLY wants to join/enroll in a course
- If message is vague ("help", "what can I do", "tell me"), use GENERAL_QUESTION
- When in doubt, default to GENERAL_QUESTION
- Require HIGH confidence (>0.85) for action intents (enroll, create_project, create_post)
- Never invent project ideas if user didn't mention creating anything

IMPORTANT: Return ONLY valid JSON, no additional text.

Return JSON format:
{{
    "intent": "intent_name",
    "confidence": 0.95,
    "parameters": {{
        "search_query": "extracted search term or null",
        "category": "course/project/user or null",
        "action_target": "what to act on or null",
        "topic": "topic if creating content or null",
        "username": "extracted username if mentioned or null",
        "post_id": "post id if mentioned or null"
    }},
    "requires_confirmation": true/false
}}"""

    try:
        # Get AI response
        response = get_ai_response(
            prompt=prompt,
            model_type=model_type
        )
        
        # Clean response - remove markdown code blocks if present
        response = response.strip()
        if response.startswith('```'):
            # Remove code block markers
            response = re.sub(r'^```json\s*', '', response)
            response = re.sub(r'^```\s*', '', response)
            response = re.sub(r'\s*```$', '', response)
        
        # Parse JSON
        intent_data = json.loads(response)
        
        # Validate intent type
        valid_intents = [
            IntentType.SEARCH,
            IntentType.ENROLL,
            IntentType.UNENROLL,
            IntentType.CREATE_PROJECT,
            IntentType.CREATE_POST,
            IntentType.JOIN_PROJECT,
            IntentType.NAVIGATE,
            IntentType.GENERAL_QUESTION,
            IntentType.VIEW_PROGRESS,
            IntentType.VIEW_MY_PROJECTS,
            IntentType.FOLLOW_USER,
            IntentType.UNFOLLOW_USER,
            IntentType.SEND_MESSAGE,
            IntentType.VIEW_USER_PROFILE,
            IntentType.COMMENT_ON_POST,
            IntentType.LIKE_POST
        ]
        
        if intent_data.get('intent') not in valid_intents:
            intent_data['intent'] = IntentType.GENERAL_QUESTION
        
        # Ensure confidence is between 0 and 1
        intent_data['confidence'] = max(0.0, min(1.0, float(intent_data.get('confidence', 0.7))))
        
        # Ensure parameters exist
        if 'parameters' not in intent_data:
            intent_data['parameters'] = {}
        
        # Ensure requires_confirmation exists
        if 'requires_confirmation' not in intent_data:
            # Default confirmation requirements
            intent_data['requires_confirmation'] = intent_data['intent'] in [
                IntentType.ENROLL,
                IntentType.CREATE_PROJECT,
                IntentType.CREATE_POST,
                IntentType.JOIN_PROJECT
            ]
        
        # FIX #3: Confidence threshold for action intents
        # Require minimum confidence for action intents to avoid false positives
        if intent_data['intent'] in [IntentType.CREATE_PROJECT, IntentType.ENROLL, IntentType.CREATE_POST, IntentType.JOIN_PROJECT]:
            if intent_data['confidence'] < 0.80:
                # Low confidence - default to general question
                intent_data['intent'] = IntentType.GENERAL_QUESTION
                intent_data['requires_confirmation'] = False
        
        # FIX #4: Keyword-based safety filter for vague messages
        vague_keywords = ['help', 'what', 'how', 'show me', 'tell me', 'explain', 'can you', 'could you']
        message_lower = message.lower()
        
        if (intent_data['intent'] == IntentType.CREATE_PROJECT and 
            any(keyword in message_lower for keyword in vague_keywords) and
            not any(word in message_lower for word in ['create', 'make', 'build', 'start', 'develop'])):
            # Vague message misclassified as project creation
            intent_data['intent'] = IntentType.GENERAL_QUESTION
            intent_data['requires_confirmation'] = False
        
        return intent_data
        
    except json.JSONDecodeError as e:
        # Fallback if JSON parsing fails
        print(f"JSON parsing error: {e}")
        print(f"Response was: {response}")
        
        # Simple keyword-based fallback
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['find', 'search', 'show', 'look for']):
            return {
                'intent': IntentType.SEARCH,
                'confidence': 0.6,
                'parameters': {'search_query': message},
                'requires_confirmation': False
            }
        elif any(word in message_lower for word in ['enroll', 'join', 'sign up']):
            return {
                'intent': IntentType.ENROLL,
                'confidence': 0.6,
                'parameters': {},
                'requires_confirmation': True
            }
        elif 'create project' in message_lower or 'make project' in message_lower:
            return {
                'intent': IntentType.CREATE_PROJECT,
                'confidence': 0.6,
                'parameters': {'topic': message},
                'requires_confirmation': True
            }
        elif 'post' in message_lower and ('write' in message_lower or 'create' in message_lower):
            return {
                'intent': IntentType.CREATE_POST,
                'confidence': 0.6,
                'parameters': {'topic': message},
                'requires_confirmation': True
            }
        else:
            return {
                'intent': IntentType.GENERAL_QUESTION,
                'confidence': 0.5,
                'parameters': {},
                'requires_confirmation': False
            }
    
    except Exception as e:
        print(f"Error in intent classification: {e}")
        # Default to general question on any error
        return {
            'intent': IntentType.GENERAL_QUESTION,
            'confidence': 0.3,
            'parameters': {},
            'requires_confirmation': False
        }


def extract_confirmation_response(message: str) -> bool:
    """
    Check if user is confirming an action
    
    Returns True if message is a confirmation (yes, do it, confirm, etc.)
    """
    message_lower = message.lower().strip()
    
    confirmations = [
        'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'do it',
        'confirm', 'proceed', 'go ahead', 'continue', 'agree'
    ]
    
    denials = [
        'no', 'nope', 'cancel', 'stop', 'dont', "don't", 'abort', 'never'
    ]
    
    # Check for confirmation
    if any(conf in message_lower for conf in confirmations):
        return True
    
    # Check for denial
    if any(denial in message_lower for denial in denials):
        return False
    
    # Default to None (unclear)
    return None
