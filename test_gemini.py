import os
import sys
import google.generativeai as genai

# Add backend to path
sys.path.append(r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend")
os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

# Get API key from environment or .env file
from dotenv import load_dotenv
load_dotenv(r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend\.env")

api_key = os.getenv('GOOGLE_GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
print(f"API Key found: {api_key[:10]}..." if api_key else "No API key found")

if api_key:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content("Hello, can you help me with Python?")
        print(f"✅ Gemini API Working!")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"❌ Error: {e}")
else:
    print("❌ No API key configured")
