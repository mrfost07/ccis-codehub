"""AI Module Analyzer Service for analyzing and breaking down learning modules"""
import json
import re
from typing import Dict, List, Any
import google.generativeai as genai
from django.conf import settings
import PyPDF2
import docx
import markdown


class ModuleAnalyzerService:
    """Service for analyzing learning modules using AI"""
    
    def __init__(self):
        """Initialize the analyzer with Gemini AI"""
        self.api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
        if self.api_key:
            genai.configure(api_key=self.api_key)
            try:
                # Try newer model names first, fallback to older ones
                try:
                    self.model = genai.GenerativeModel('gemini-1.5-flash')
                except:
                    try:
                        self.model = genai.GenerativeModel('gemini-1.0-pro')
                    except:
                        self.model = genai.GenerativeModel('gemini-pro')
            except:
                self.model = None
        else:
            self.model = None
    
    def analyze_module(self, file) -> Dict[str, Any]:
        """
        Analyze uploaded module file and extract structured learning content
        
        Args:
            file: Uploaded file (PDF, DOCX, MD, or TXT)
            
        Returns:
            Dictionary with analyzed module structure
        """
        try:
            # Extract text from file
            content = self.extract_text_from_file(file)
            
            if not content:
                return {
                    'success': False,
                    'error': 'Could not extract content from file'
                }
            
            # Analyze with AI if available
            if self.model:
                analysis = self.ai_analyze_content(content)
            else:
                # Fallback to basic analysis
                analysis = self.basic_analyze_content(content)
            
            return {
                'success': True,
                'module_data': analysis['module_data'],
                'quiz_data': analysis.get('quiz_data'),
                'summary': analysis.get('summary', 'Module analyzed successfully')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def extract_text_from_file(self, file) -> str:
        """Extract text content from various file formats"""
        content = ""
        file_extension = file.name.split('.')[-1].lower()
        
        try:
            if file_extension == 'pdf':
                # Read PDF
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    content += page.extract_text()
                    
            elif file_extension in ['docx', 'doc']:
                # Read Word document
                doc = docx.Document(file)
                for paragraph in doc.paragraphs:
                    content += paragraph.text + "\n"
                    
            elif file_extension == 'md':
                # Read Markdown
                text = file.read().decode('utf-8')
                content = markdown.markdown(text)
                
            elif file_extension in ['txt', 'text']:
                # Read plain text
                content = file.read().decode('utf-8')
                
            else:
                # Try to read as text
                content = file.read().decode('utf-8')
                
        except Exception as e:
            print(f"Error extracting text: {str(e)}")
            
        return content
    
    def ai_analyze_content(self, content: str) -> Dict[str, Any]:
        """Use AI to analyze and structure the content"""
        try:
            prompt = f"""
            Analyze this learning module content and extract the following information:
            
            1. Module title
            2. Brief description (2-3 sentences)
            3. Learning objectives (list of key points)
            4. Estimated duration in minutes
            5. Difficulty level (beginner/intermediate/advanced)
            6. Main topics covered
            7. Prerequisites if any
            8. Create 5 quiz questions based on the content
            
            Content:
            {content[:3000]}  # Limit content to avoid token limits
            
            Return the analysis in JSON format with these keys:
            - title
            - description
            - objectives (array)
            - duration_minutes (number)
            - difficulty_level
            - topics (array)
            - prerequisites (array)
            - quiz_questions (array of objects with: question, choices, correct_index, explanation)
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse the response
            try:
                # Extract JSON from response
                json_str = response.text
                # Find JSON content between ```json and ```
                json_match = re.search(r'```json\s*(.*?)\s*```', json_str, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                
                result = json.loads(json_str)
            except:
                # Fallback to basic extraction
                result = self.extract_basic_info(response.text)
            
            # Structure the response
            return {
                'module_data': {
                    'title': result.get('title', 'Untitled Module'),
                    'description': result.get('description', 'Learning module'),
                    'content': content,
                    'duration_minutes': result.get('duration_minutes', 30),
                    'difficulty_level': result.get('difficulty_level', 'beginner'),
                    'module_type': 'text'
                },
                'quiz_data': {
                    'title': f"Quiz: {result.get('title', 'Module Quiz')}",
                    'questions': self.format_quiz_questions(result.get('quiz_questions', [])),
                    'time_limit': 30,
                    'passing_score': 70
                },
                'summary': f"Successfully analyzed: {result.get('title', 'Module')}"
            }
            
        except Exception as e:
            print(f"AI analysis error: {str(e)}")
            return self.basic_analyze_content(content)
    
    def basic_analyze_content(self, content: str) -> Dict[str, Any]:
        """Basic content analysis without AI"""
        # Extract title (first line or first heading)
        lines = content.split('\n')
        title = lines[0] if lines else 'Untitled Module'
        title = title.strip('#').strip()
        
        # Estimate duration based on word count
        word_count = len(content.split())
        duration_minutes = max(10, min(120, word_count // 150 * 5))
        
        # Determine difficulty based on content complexity
        difficulty = 'beginner'
        if any(word in content.lower() for word in ['advanced', 'complex', 'expert']):
            difficulty = 'advanced'
        elif any(word in content.lower() for word in ['intermediate', 'moderate']):
            difficulty = 'intermediate'
        
        # Extract topics (look for headings or bullet points)
        topics = []
        for line in lines[:20]:  # Check first 20 lines
            if line.startswith('#') or line.startswith('-') or line.startswith('*'):
                topic = line.strip('#-* ').strip()
                if topic and len(topic) > 3:
                    topics.append(topic)
        
        return {
            'module_data': {
                'title': title,
                'description': f'Learning module: {title}',
                'content': content,
                'duration_minutes': duration_minutes,
                'difficulty_level': difficulty,
                'module_type': 'text'
            },
            'quiz_data': {
                'title': f'Quiz: {title}',
                'questions': self.generate_basic_questions(content),
                'time_limit': 30,
                'passing_score': 70
            },
            'summary': f'Module "{title}" processed successfully'
        }
    
    def format_quiz_questions(self, questions: List[Any]) -> List[Dict]:
        """Format quiz questions into standard structure"""
        formatted = []
        
        for idx, q in enumerate(questions[:10]):  # Limit to 10 questions
            if isinstance(q, dict):
                formatted.append({
                    'question': q.get('question', 'Question'),
                    'type': 'multiple_choice',
                    'choices': q.get('choices', ['Option A', 'Option B', 'Option C', 'Option D']),
                    'correct_index': q.get('correct_index', 0),
                    'explanation': q.get('explanation', ''),
                    'points': 1,
                    'order': idx
                })
        
        return formatted
    
    def generate_basic_questions(self, content: str) -> List[Dict]:
        """Generate basic questions from content without AI"""
        questions = []
        
        # Extract key sentences that could be questions
        sentences = content.split('.')[:10]  # First 10 sentences
        
        for idx, sentence in enumerate(sentences[:3]):
            if len(sentence) > 20:
                # Create a simple true/false question
                questions.append({
                    'question': f'Is the following statement correct? "{sentence.strip()}"',
                    'type': 'true_false',
                    'correct_answer': {'answer': True},
                    'explanation': 'Based on the module content',
                    'points': 1,
                    'order': idx
                })
        
        # Add a generic question
        questions.append({
            'question': 'What is the main topic of this module?',
            'type': 'short_answer',
            'correct_answer': {'answer': 'Various answers accepted'},
            'explanation': 'Describe the main concepts covered',
            'points': 2,
            'order': len(questions)
        })
        
        return questions
    
    def extract_basic_info(self, text: str) -> Dict:
        """Extract basic information from text using patterns"""
        result = {
            'title': 'Learning Module',
            'description': 'Educational content',
            'duration_minutes': 30,
            'difficulty_level': 'beginner',
            'topics': [],
            'prerequisites': [],
            'quiz_questions': []
        }
        
        # Try to extract title
        title_patterns = [r'Title:\s*(.+)', r'Module:\s*(.+)', r'^#\s*(.+)']
        for pattern in title_patterns:
            match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
            if match:
                result['title'] = match.group(1).strip()
                break
        
        # Extract topics
        topic_pattern = r'(?:Topics?|Objectives?):\s*(.+?)(?:\n\n|\Z)'
        match = re.search(topic_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            topics_text = match.group(1)
            result['topics'] = [t.strip() for t in re.findall(r'[-*]\s*(.+)', topics_text)]
        
        return result
