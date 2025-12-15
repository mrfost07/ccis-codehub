"""
AI Service Layer - Supports multiple AI models
"""
import os
import json
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class BaseAIService(ABC):
    """Base class for AI services"""
    
    @abstractmethod
    def generate_response(self, prompt: str, context: Optional[List[Dict]] = None) -> str:
        """Generate AI response"""
        pass
    
    @abstractmethod
    def analyze_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Analyze code and provide suggestions"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        pass


class GeminiService(BaseAIService):
    """Google Gemini AI Service"""
    
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
        if not self.api_key:
            self.api_key = os.getenv('GEMINI_API_KEY')
        self.model_name = "gemini-2.0-flash"  # Using Gemini 2.0 Flash
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        if not self.api_key or self.api_key == 'your-gemini-api-key-here':
            logger.warning("Google Gemini API key not configured")
            self.api_key = None
    
    def generate_response(self, prompt: str, context: Optional[List[Dict]] = None) -> str:
        """Generate response using Google Gemini"""
        if not self.api_key:
            return "Please configure your Google Gemini API key in the .env file. Get your free key at: https://makersuite.google.com/app/apikey"
        
        try:
            import google.generativeai as genai
            
            # Configure Gemini
            genai.configure(api_key=self.api_key)
            
            # Use the correct model name format for Gemini API
            # The API expects 'models/' prefix for some models
            model = None
            last_error = None
            
            # List of model names to try - using correct format for Gemini API
            # Must use models/ prefix for newer API versions
            model_attempts = [
                ('models/gemini-2.5-flash', 'Gemini 2.5 Flash'),
                ('models/gemini-flash-latest', 'Gemini Flash Latest'),
                ('models/gemini-2.0-flash', 'Gemini 2.0 Flash'),
                ('models/gemini-pro-latest', 'Gemini Pro Latest'),
            ]
            
            for model_path, display_name in model_attempts:
                try:
                    model = genai.GenerativeModel(model_path)
                    logger.info(f"Successfully initialized Gemini model: {display_name}")
                    break
                except Exception as e:
                    last_error = e
                    logger.debug(f"Failed to initialize {display_name}: {str(e)}")
                    continue
            
            if not model:
                # Final fallback - use a simple test response
                logger.error(f"All Gemini models failed. Last error: {last_error}")
                return "I'm your AI assistant! I can help with coding, debugging, and learning. What would you like to know about?"
            
            # Build conversation history
            messages = []
            if context:
                for msg in context:
                    role = "user" if msg.get('sender') == 'user' else "model"
                    messages.append({
                        "role": role,
                        "parts": [msg.get('message', '')]
                    })
            
            # Add current prompt
            messages.append({
                "role": "user",
                "parts": [prompt]
            })
            
            # Generate response
            response = model.generate_content(prompt)
            return response.text
            
        except ImportError:
            raise Exception("Google Gemini library not installed. Run: pip install google-generativeai")
        except Exception as e:
            error_str = str(e)
            logger.error(f"Gemini API error: {error_str}")
            
            # For API key errors, raise exception so caller can try alternative
            if "API_KEY_INVALID" in error_str or "API key not valid" in error_str:
                raise Exception(f"Invalid Gemini API key. Please check your GOOGLE_GEMINI_API_KEY in .env or use OpenRouter instead.")
            
            # Handle rate limit errors - raise exception for fallback
            if "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower():
                raise Exception(f"Gemini rate limit exceeded. Try again later or switch to OpenRouter.")
            
            # For other errors, raise exception so caller can handle
            raise Exception(f"Gemini API error: {error_str}")
    
    def analyze_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Analyze code using Gemini"""
        if not self.api_key:
            return {
                "error": "API key not configured",
                "suggestions": ["Configure Google Gemini API key"],
                "complexity_score": 0
            }
        
        prompt = f"""
        Analyze the following {language} code and provide:
        1. Code quality assessment
        2. Potential bugs or issues
        3. Optimization suggestions
        4. Security concerns if any
        5. Complexity score (1-10)
        
        Code:
        ```{language}
        {code}
        ```
        
        Provide response in JSON format.
        """
        
        try:
            response = self.generate_response(prompt)
            # Try to parse as JSON
            try:
                return json.loads(response)
            except:
                return {
                    "analysis": response,
                    "complexity_score": 5
                }
        except Exception as e:
            return {
                "error": str(e),
                "complexity_score": 0
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get Gemini model info"""
        return {
            "provider": "Google",
            "model": self.model_name,
            "name": "Gemini Pro",
            "description": "Google's most capable AI model for text generation",
            "max_tokens": 32768,
            "free_tier": True,
            "configured": bool(self.api_key and self.api_key != 'your-gemini-api-key-here')
        }


class OpenAIService(BaseAIService):
    """OpenAI GPT Service"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model_name = "gpt-3.5-turbo"
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured")
    
    def generate_response(self, prompt: str, context: Optional[List[Dict]] = None) -> str:
        """Generate response using OpenAI"""
        if not self.api_key:
            return "Please configure your OpenAI API key in the .env file."
        
        try:
            import openai
            
            openai.api_key = self.api_key
            
            # Build messages
            messages = [
                {"role": "system", "content": "You are a helpful AI mentor for computer science students."}
            ]
            
            if context:
                for msg in context:
                    role = "user" if msg.get('sender') == 'user' else "assistant"
                    messages.append({
                        "role": role,
                        "content": msg.get('message', '')
                    })
            
            messages.append({"role": "user", "content": prompt})
            
            # Generate response
            response = openai.ChatCompletion.create(
                model=self.model_name,
                messages=messages,
                max_tokens=1024,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except ImportError:
            return "OpenAI library not installed. Run: pip install openai"
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            return f"Error generating response: {str(e)}"
    
    def analyze_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Analyze code using OpenAI"""
        if not self.api_key:
            return {
                "error": "API key not configured",
                "suggestions": ["Configure OpenAI API key"],
                "complexity_score": 0
            }
        
        prompt = f"""
        Analyze this {language} code and provide JSON response with:
        - quality_assessment
        - potential_issues
        - optimization_suggestions
        - security_concerns
        - complexity_score (1-10)
        
        Code: {code}
        """
        
        try:
            response = self.generate_response(prompt)
            try:
                return json.loads(response)
            except:
                return {
                    "analysis": response,
                    "complexity_score": 5
                }
        except Exception as e:
            return {
                "error": str(e),
                "complexity_score": 0
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get OpenAI model info"""
        return {
            "provider": "OpenAI",
            "model": self.model_name,
            "name": "GPT-3.5 Turbo",
            "description": "OpenAI's efficient conversational AI model",
            "max_tokens": 4096,
            "free_tier": False,
            "configured": bool(self.api_key)
        }


class LocalAIService(BaseAIService):
    """Fallback local AI service (uses simple responses)"""
    
    def generate_response(self, prompt: str, context: Optional[List[Dict]] = None) -> str:
        """Generate simple response without AI"""
        responses = {
            "hello": "Hello! I'm your AI mentor. How can I help you today?",
            "help": "I can help you with programming questions, code reviews, and learning recommendations.",
            "python": "Python is a great language for beginners! Would you like to learn about specific Python topics?",
            "javascript": "JavaScript is essential for web development. What would you like to know?",
            "debug": "For debugging, try: 1) Check error messages, 2) Use print statements, 3) Use a debugger, 4) Review logic flow.",
            "learn": "I recommend starting with fundamentals: data structures, algorithms, and then moving to frameworks.",
        }
        
        prompt_lower = prompt.lower()
        for key, response in responses.items():
            if key in prompt_lower:
                return response
        
        return "I understand you're asking about programming. While I don't have AI capabilities configured yet, you can enable them by adding your API keys to the .env file."
    
    def analyze_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Basic code analysis without AI"""
        lines = code.strip().split('\n')
        
        # Simple analysis
        suggestions = []
        if len(lines) > 50:
            suggestions.append("Consider breaking this into smaller functions")
        if 'TODO' in code or 'FIXME' in code:
            suggestions.append("Complete TODO/FIXME items")
        if not any(line.strip().startswith('#') for line in lines):
            suggestions.append("Add comments to explain complex logic")
        
        return {
            "lines_of_code": len(lines),
            "suggestions": suggestions if suggestions else ["Code looks good!"],
            "complexity_score": min(len(lines) // 10, 10)
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get local model info"""
        return {
            "provider": "Local",
            "model": "simple-responses",
            "name": "Local Fallback",
            "description": "Simple response system (no AI)",
            "max_tokens": 1000,
            "free_tier": True,
            "configured": True
        }


class OpenRouterService(BaseAIService):
    """OpenRouter AI Service - Access multiple models via OpenRouter API"""
    
    def __init__(self, model: str = None):
        # Try Django settings first, then os.getenv
        try:
            from django.conf import settings
            self.api_key = getattr(settings, 'OPENROUTER_API_KEY', None) or os.getenv('OPENROUTER_API_KEY')
            default_model = getattr(settings, 'OPENROUTER_MODEL', None) or os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-exp:free')
        except:
            self.api_key = os.getenv('OPENROUTER_API_KEY')
            default_model = os.getenv('OPENROUTER_MODEL', 'google/gemini-2.0-flash-exp:free')
        
        self.base_url = "https://openrouter.ai/api/v1"
        self.model_name = model or default_model
        
        # Debug logging
        logger.info(f"OpenRouterService.__init__: model={self.model_name}")
        logger.info(f"OpenRouterService.__init__: api_key present={bool(self.api_key)}, key_prefix={self.api_key[:20] if self.api_key else 'None'}...")
        
        if not self.api_key:
            logger.warning("OpenRouter API key not configured")
    
    def get_system_prompt(self, user_role: str = 'student') -> str:
        """Get role-based system prompt for AI responses"""
        
        base_context = "You are an AI assistant for CCIS-CodeHub, an educational platform for computer science students."
        
        role_prompts = {
            'student': f"""{base_context}

You are a friendly and encouraging AI mentor for students. Your role is to:
- Help students understand programming concepts with clear explanations
- Provide step-by-step guidance when solving coding problems
- Encourage learning and celebrate progress
- Suggest resources and practice exercises
- Be patient and supportive, especially with beginners
- Use code examples to illustrate concepts
- Answer questions about courses, projects, and the learning path

Tone: Supportive, educational, encouraging. Use emojis occasionally to be friendly 😊
Format: Use bullet points for lists, code blocks for code, and keep explanations concise.""",

            'instructor': f"""{base_context}

You are a professional teaching assistant for instructors. Your role is to:
- Help with course content creation and curriculum planning
- Suggest assessment strategies and quiz questions
- Provide insights on student engagement and learning analytics
- Assist with grading rubrics and feedback templates
- Offer pedagogical best practices for CS education
- Help manage course modules and learning paths
- Support with administrative teaching tasks

Tone: Professional, collaborative, efficient. Focus on actionable insights.
Format: Use structured lists, tables when appropriate, and be concise.""",

            'admin': f"""{base_context}

You are an administrative assistant for platform administrators. Your role is to:
- Help with platform management and user administration
- Provide analytics insights and reporting suggestions
- Assist with content moderation and quality assurance
- Offer guidance on platform policies and best practices
- Help troubleshoot common issues and user concerns
- Support with system configuration recommendations
- Provide overview of platform health and metrics

Tone: Professional, authoritative, solution-oriented.
Format: Be direct, provide actionable recommendations, use bullet points.""",
        }
        
        return role_prompts.get(user_role, role_prompts['student'])
    
    def generate_response(self, prompt: str, context: Optional[List[Dict]] = None, user_role: str = 'student') -> str:
        """Generate response using OpenRouter API with retries and fallback"""
        if not self.api_key:
            return "Please configure your OPENROUTER_API_KEY in the .env file. Get your free key at: https://openrouter.ai/"
        
        try:
            import requests
            import time
            
            # Build messages with role-based system prompt
            messages = [
                {"role": "system", "content": self.get_system_prompt(user_role)}
            ]
            
            if context:
                for msg in context:
                    role = "user" if msg.get('sender') == 'user' else "assistant"
                    messages.append({
                        "role": role,
                        "content": msg.get('message', '')
                    })
            
            messages.append({"role": "user", "content": prompt})
            
            # List of models to try in order (verified working OpenRouter free model IDs)
            models_to_try = [
                self.model_name,
                "google/gemini-2.0-flash-exp:free",
                "mistralai/mistral-7b-instruct:free",
                "meta-llama/llama-3.2-3b-instruct:free",
                "qwen/qwen-2-7b-instruct:free",  # Qwen - usually available
                "openchat/openchat-7b:free",  # OpenChat fallback
                "huggingfaceh4/zephyr-7b-beta:free",  # Zephyr fallback
                # New OpenRouter fallback models
                "tngtech/deepseek-r1t2-chimera:free",
                "kwaipilot/kat-coder-pro:free",
                "nvidia/nemotron-nano-12b-v2-vl:free",
                "tngtech/deepseek-r1t-chimera:free",
                "z-ai/glm-4.5-air:free",
                "tngtech/tng-r1t-chimera:free",
                "qwen/qwen3-coder:free",
                "openai/gpt-oss-20b:free",
            ]
            
            # Remove duplicates while preserving order
            seen = set()
            unique_models = []
            for m in models_to_try:
                if m not in seen:
                    unique_models.append(m)
                    seen.add(m)
            
            max_retries = 3
            last_error = None
            
            for model in unique_models:
                logger.info(f"Trying model: {model}")
                
                for attempt in range(max_retries):
                    try:
                        # Make request to OpenRouter
                        logger.info(f"OpenRouter request (attempt {attempt+1}/{max_retries}): model={model}")
                        response = requests.post(
                            f"{self.base_url}/chat/completions",
                            headers={
                                "Authorization": f"Bearer {self.api_key}",
                                "Content-Type": "application/json",
                                "HTTP-Referer": "http://localhost:8000",
                                "X-Title": "CCIS-CodeHub"
                            },
                            json={
                                "model": model,
                                "messages": messages,
                                "max_tokens": 4096,
                                "temperature": 0.7
                            },
                            timeout=120
                        )
                        
                        logger.info(f"OpenRouter response status: {response.status_code}")
                        
                        if response.status_code == 200:
                            data = response.json()
                            content = data['choices'][0]['message']['content']
                            logger.info(f"OpenRouter success with {model}, length: {len(content)}")
                            
                            # Add notification if we had to use a fallback model
                            if model != self.model_name:
                                # Get friendly model names
                                model_names = {
                                    'google/gemini-2.0-flash-exp:free': 'Gemini 2.0 Flash',
                                    'mistralai/mistral-7b-instruct:free': 'Mistral 7B',
                                    'meta-llama/llama-3.2-3b-instruct:free': 'Llama 3.2 3B',
                                    'qwen/qwen-2-7b-instruct:free': 'Qwen 2 7B',
                                    'openchat/openchat-7b:free': 'OpenChat 7B',
                                    'huggingfaceh4/zephyr-7b-beta:free': 'Zephyr 7B',
                                    # New OpenRouter models
                                    'tngtech/deepseek-r1t2-chimera:free': 'DeepSeek R1T2 Chimera',
                                    'kwaipilot/kat-coder-pro:free': 'Kat Coder Pro',
                                    'nvidia/nemotron-nano-12b-v2-vl:free': 'Nemotron Nano 12B',
                                    'tngtech/deepseek-r1t-chimera:free': 'DeepSeek R1T Chimera',
                                    'z-ai/glm-4.5-air:free': 'GLM 4.5 Air',
                                    'tngtech/tng-r1t-chimera:free': 'TNG R1T Chimera',
                                    'qwen/qwen3-coder:free': 'Qwen3 Coder',
                                    'openai/gpt-oss-20b:free': 'GPT OSS 20B',
                                }
                                primary_name = model_names.get(self.model_name, self.model_name)
                                fallback_name = model_names.get(model, model)
                                
                                fallback_notice = f"⚠️ *{primary_name} is currently rate limited. Responded using {fallback_name}.*\n\n---\n\n"
                                content = fallback_notice + content
                            
                            return content
                            
                        elif response.status_code == 429:
                            logger.warning(f"OpenRouter 429 (Rate Limit) for {model}")
                            # Wait with exponential backoff
                            sleep_time = (attempt + 1) * 2
                            time.sleep(sleep_time)
                            continue
                            
                        else:
                            error_msg = response.text
                            logger.error(f"OpenRouter error {response.status_code}: {error_msg}")
                            # Don't retry for other errors (400, 401, etc), move to next model
                            break
                            
                    except requests.exceptions.Timeout:
                        logger.warning(f"Timeout on attempt {attempt+1}")
                        last_error = "Timeout"
                    except Exception as e:
                        logger.error(f"Request error: {e}")
                        last_error = str(e)
            
            if last_error:
                return f"Error connecting to AI service: {last_error}"
            
            return "AI service is currently unavailable. Rate limits exceeded for all available models. Please try again later."
                
        except ImportError:
            return "requests library not installed. Run: pip install requests"
        except Exception as e:
            logger.error(f"OpenRouter API fatal error: {str(e)}")
            return f"Error generating response: {str(e)}"
    
    def analyze_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Analyze code using OpenRouter"""
        if not self.api_key:
            return {
                "error": "API key not configured",
                "suggestions": ["Configure OPENROUTER_API_KEY"],
                "complexity_score": 0
            }
        
        prompt = f"""
        Analyze this {language} code and provide JSON response with:
        - quality_assessment
        - potential_issues
        - optimization_suggestions
        - security_concerns
        - complexity_score (1-10)
        
        Code: {code}
        """
        
        try:
            response = self.generate_response(prompt)
            try:
                import json
                return json.loads(response)
            except:
                return {
                    "analysis": response,
                    "complexity_score": 5
                }
        except Exception as e:
            return {
                "error": str(e),
                "complexity_score": 0
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get OpenRouter model info"""
        return {
            "provider": "OpenRouter",
            "model": self.model_name,
            "name": "OpenRouter (Gemini 2.0 Flash Free)",
            "description": "Access multiple AI models via OpenRouter - FREE Gemini 2.0 Flash",
            "max_tokens": 4096,
            "free_tier": True,
            "configured": bool(self.api_key)
        }


class AIServiceFactory:
    """Factory class to get appropriate AI service"""
    
    # Model ID to OpenRouter model name mapping
    OPENROUTER_MODELS = {
        'openrouter_gemini': 'google/gemini-2.0-flash-exp:free',
        'openrouter_amazon_nova': 'amazon/nova-2-lite-v1:free',
        'openrouter_deepseek': 'nex-agi/deepseek-v3.1-nex-n1:free',
        'openrouter_mistral': 'mistralai/devstral-2512:free',
        'openrouter': 'google/gemini-2.0-flash-exp:free',  # Legacy
        # New OpenRouter models
        'openrouter_deepseek_r1t2': 'tngtech/deepseek-r1t2-chimera:free',
        'openrouter_katcoder': 'kwaipilot/kat-coder-pro:free',
        'openrouter_nemotron': 'nvidia/nemotron-nano-12b-v2-vl:free',
        'openrouter_deepseek_r1t': 'tngtech/deepseek-r1t-chimera:free',
        'openrouter_glm4': 'z-ai/glm-4.5-air:free',
        'openrouter_tng_r1t': 'tngtech/tng-r1t-chimera:free',
        'openrouter_qwen3_coder': 'qwen/qwen3-coder:free',
        'openrouter_gpt_oss': 'openai/gpt-oss-20b:free',
    }
    
    _services = {
        'google_gemini': GeminiService,
        'gemini_direct': GeminiService,
        'openai_gpt4': OpenAIService,
        'openrouter': OpenRouterService,
        'openrouter_gemini': OpenRouterService,
        'openrouter_amazon_nova': OpenRouterService,
        'openrouter_deepseek': OpenRouterService,
        'openrouter_mistral': OpenRouterService,
        # New OpenRouter models
        'openrouter_deepseek_r1t2': OpenRouterService,
        'openrouter_katcoder': OpenRouterService,
        'openrouter_nemotron': OpenRouterService,
        'openrouter_deepseek_r1t': OpenRouterService,
        'openrouter_glm4': OpenRouterService,
        'openrouter_tng_r1t': OpenRouterService,
        'openrouter_qwen3_coder': OpenRouterService,
        'openrouter_gpt_oss': OpenRouterService,
        'anthropic_claude': LocalAIService,
        'local': LocalAIService,
        # Legacy mappings
        'gemini': GeminiService,
        'openai': OpenAIService,
    }
    
    @classmethod
    def get_service(cls, model_type: str = None) -> BaseAIService:
        """Get AI service instance"""
        if not model_type:
            # No model specified - raise helpful error
            raise ValueError("No AI model selected. Please select a model in AI Settings.")
        
        logger.info(f"AIServiceFactory: Requested model: {model_type}")
        
        # Check if this is an OpenRouter model that needs specific model name
        if model_type in cls.OPENROUTER_MODELS:
            openrouter_model = cls.OPENROUTER_MODELS[model_type]
            logger.info(f"AIServiceFactory: Using OpenRouter model: {openrouter_model}")
            return OpenRouterService(model=openrouter_model)
        
        # Handle legacy google_gemini - check if API key is configured
        if model_type in ('google_gemini', 'gemini_direct', 'gemini'):
            service = GeminiService()
            if not service.api_key:
                # Gemini not configured, fallback to OpenRouter
                logger.warning(f"GeminiService not configured, falling back to OpenRouter")
                return OpenRouterService(model='google/gemini-2.0-flash-exp:free')
            return service
        
        service_class = cls._services.get(model_type, OpenRouterService)
        logger.info(f"AIServiceFactory: Using service class: {service_class.__name__}")
        return service_class()
    
    @classmethod
    def get_available_models(cls) -> List[Dict[str, Any]]:
        """Get list of available AI models"""
        models = []
        for key, service_class in cls._services.items():
            service = service_class()
            info = service.get_model_info()
            info['key'] = key
            info['is_default'] = (key == os.getenv('AI_MODEL_DEFAULT', 'openrouter'))
            models.append(info)
        return models
    
    @classmethod
    def test_model(cls, model_type: str) -> Dict[str, Any]:
        """Test if a model is properly configured"""
        try:
            service = cls.get_service(model_type)
            response = service.generate_response("Hello, are you working?")
            return {
                "status": "success",
                "model": model_type,
                "response": response[:100] + "..." if len(response) > 100 else response,
                "configured": True
            }
        except Exception as e:
            return {
                "status": "error",
                "model": model_type,
                "error": str(e),
                "configured": False
            }


# Helper function for views
def get_ai_response(prompt: str, model_type: str = None, context: List[Dict] = None, user_role: str = 'student') -> str:
    """Helper function to get AI response with role-based prompts"""
    service = AIServiceFactory.get_service(model_type)
    # Check if service supports user_role (OpenRouterService does)
    if hasattr(service.generate_response, '__code__') and 'user_role' in service.generate_response.__code__.co_varnames:
        return service.generate_response(prompt, context, user_role=user_role)
    return service.generate_response(prompt, context)


def get_ai_response_with_context(
    prompt: str, 
    user=None, 
    model_type: str = None, 
    context: List[Dict] = None,
    include_stats: bool = True,
    include_courses: bool = True,
    include_user: bool = True
) -> str:
    """
    Enhanced AI response function with database context injection.
    This provides the AI with real-time platform data for accurate answers.
    """
    from .data_context_service import DataContextService
    
    # Build database context
    data_service = DataContextService(user)
    db_context = data_service.build_context_string(
        include_stats=include_stats,
        include_courses=include_courses,
        include_user=include_user
    )
    
    # Get query-specific context
    query_context = data_service.get_context_for_query(prompt)
    
    # Build enhanced prompt with context
    enhanced_prompt = f"""You are a professional AI mentor for CCIS CodeHub, a learning platform for computer science students.
You have access to real-time platform data. Use this information to give accurate, specific answers.

{db_context}

QUERY CONTEXT TYPE: {query_context['type']}
{_format_query_context(query_context)}

USER QUERY: {prompt}

CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
1. DO NOT use asterisks (*) anywhere in your response - they look unprofessional
2. For emphasis, just use CAPS or quotation marks like "this"
3. Use bullet points with the dash character (-) for lists
4. Use numbered lists (1. 2. 3.) for steps or sequences  
5. Keep responses concise, clear, and well-structured
6. Use short paragraphs separated by blank lines
7. Be formal, professional, and helpful
8. Start responses with a direct answer, not greetings

CONTENT RULES:
1. Use EXACT names from the platform data when referring to courses, projects, or users
2. Provide accurate statistics from the data above
3. If asked about a specific item, check if it exists in the data first
4. If something doesn't exist, say so clearly and suggest alternatives
5. Suggest relevant actions when appropriate (enroll, view, explore)

Provide a professional, well-formatted response:"""

    service = AIServiceFactory.get_service(model_type)
    return service.generate_response(enhanced_prompt, context)


def _format_query_context(query_context: dict) -> str:
    """Format query-specific context for AI prompt"""
    context_parts = []
    
    if query_context['type'] == 'courses' and 'matched_course' in query_context.get('data', {}):
        course = query_context['data']['matched_course']
        context_parts.append(f"MATCHED COURSE: {course['name']} (ID: {course['id']}, {course['module_count']} modules)")
    
    if query_context['type'] == 'courses' and 'all_courses' in query_context.get('data', {}):
        courses = query_context['data']['all_courses'][:5]
        names = ", ".join([c['name'] for c in courses])
        context_parts.append(f"TOP COURSES: {names}")
    
    if query_context['type'] == 'projects' and 'open_projects' in query_context.get('data', {}):
        projects = query_context['data']['open_projects'][:5]
        if projects:
            titles = ", ".join([p['title'] for p in projects])
            context_parts.append(f"PROJECTS LOOKING FOR CONTRIBUTORS: {titles}")
    
    if query_context['type'] == 'users' and 'matched_user' in query_context.get('data', {}):
        user = query_context['data']['matched_user']
        if user:
            context_parts.append(f"MATCHED USER: {user['full_name']} (@{user['username']}, {user['role']})")
    
    if query_context['type'] == 'stats' and 'stats' in query_context.get('data', {}):
        stats = query_context['data']['stats']
        context_parts.append(f"SYSTEM STATS: {stats['total_users']} users, {stats['total_courses']} courses, {stats['total_projects']} projects")
    
    if query_context['type'] == 'posts' and 'recent_posts' in query_context.get('data', {}):
        posts = query_context['data']['recent_posts'][:3]
        if posts:
            post_info = ", ".join([f"'{p['content'][:30]}...' by @{p['author']}" for p in posts])
            context_parts.append(f"RECENT POSTS: {post_info}")
    
    return "\n".join(context_parts) if context_parts else "No specific context data"


def analyze_code_with_ai(code: str, language: str = "python", model_type: str = None) -> Dict[str, Any]:
    """Helper function to analyze code"""
    service = AIServiceFactory.get_service(model_type)
    return service.analyze_code(code, language)

