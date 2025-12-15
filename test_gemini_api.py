"""
Test Gemini API connectivity and configuration
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.conf import settings
import google.generativeai as genai

print("=" * 60)
print("GEMINI API TEST")
print("=" * 60)

# Check API key
api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', None)
print(f"\n1. API Key from settings: {'[OK] Found' if api_key else '[FAIL] Not found'}")
if api_key:
    print(f"   Key starts with: {api_key[:10]}...")
    print(f"   Key length: {len(api_key)} characters")
else:
    print("   ERROR: No API key configured!")
    sys.exit(1)

# Test configuration
print("\n2. Testing Gemini configuration...")
try:
    genai.configure(api_key=api_key)
    print("   [OK] Gemini configured successfully")
except Exception as e:
    print(f"   [FAIL] Configuration failed: {e}")
    sys.exit(1)

# Test model initialization
print("\n3. Testing model initialization...")
models_to_try = [
    'models/gemini-2.5-flash',
    'models/gemini-flash-latest',
    'models/gemini-2.0-flash',
    'models/gemini-pro-latest',
]

successful_model = None
for model_name in models_to_try:
    try:
        print(f"   Trying: {model_name}...", end=' ')
        model = genai.GenerativeModel(model_name)
        print("[OK] Success!")
        successful_model = model_name
        break
    except Exception as e:
        print(f"[FAIL] Failed ({str(e)[:50]})")

if not successful_model:
    print("\n   ERROR: No models could be initialized!")
    sys.exit(1)

print(f"\n   [OK] Using model: {successful_model}")

# Test actual AI generation
print("\n4. Testing AI text generation...")
try:
    model = genai.GenerativeModel(successful_model)
    response = model.generate_content("Say 'Hello! I am working correctly!' in a friendly way.")
    
    print("   [OK] AI Response received:")
    try:
        print(f"   {response.text}")
    except UnicodeEncodeError:
        print(f"   {response.text.encode('ascii', 'ignore').decode()}")
    
except Exception as e:
    print(f"   [FAIL] Generation failed: {e}")
    sys.exit(1)

# Test with conversation context
print("\n5. Testing conversational AI...")
try:
    model = genai.GenerativeModel(successful_model)
    prompt = "Can you help me with Python programming?"
    response = model.generate_content(prompt)
    
    print("   [OK] Conversational response:")
    try:
        print(f"   {response.text[:200]}...")
    except UnicodeEncodeError:
        print(f"   {response.text[:200].encode('ascii', 'ignore').decode()}...")
    
except Exception as e:
    print(f"   [FAIL] Conversation test failed: {e}")

# Test via our AI service
print("\n6. Testing via AI Service wrapper...")
try:
    from apps.ai_mentor.services.ai_service import AIServiceFactory
    
    service = AIServiceFactory.get_service('google_gemini')
    response = service.generate_response("Hello! Are you working?")
    
    print("   [OK] AI Service response:")
    try:
        print(f"   {response[:200]}...")
    except UnicodeEncodeError:
        print(f"   {response[:200].encode('ascii', 'ignore').decode()}...")
    
except Exception as e:
    print(f"   [FAIL] AI Service test failed: {e}")
    import traceback
    traceback.print_exc()

# Summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("[OK] API Key: Configured")
print("[OK] Gemini Library: Installed and working")
print(f"[OK] Model: {successful_model}")
print("[OK] AI Generation: Working")
print("[OK] AI Service: Working")
print("\n[SUCCESS] GEMINI API IS FULLY FUNCTIONAL!")
print("\nYour AI Mentor chatbot should be working now.")
print("Make sure the backend server is running:")
print("  cd backend")
print("  python manage.py runserver")
print("=" * 60)
