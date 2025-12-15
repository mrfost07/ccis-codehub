#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Comprehensive test script for all CCIS-CodeHub features
Tests registration, login, community posts, profile updates, AI chat, etc.
"""
import requests
import json
import random
import time
import os
import sys

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

def generate_test_user():
    """Generate unique test user data"""
    rand_id = random.randint(1000, 9999)
    return {
        "username": f"testuser_{rand_id}",
        "email": f"test_{rand_id}@test.com",
        "first_name": "Test",
        "last_name": f"User{rand_id}",
        "password": "TestPass123!",
        "confirm_password": "TestPass123!",
        "program": random.choice(["BSIT", "BSCS", "BSIS"]),
        "year_level": random.choice(["1", "2", "3", "4"]),
        "role": "student"
    }

def test_registration():
    """Test user registration"""
    print("\n1. Testing Registration...")
    user_data = generate_test_user()
    
    response = requests.post(f"{BASE_URL}/api/auth/register/", json=user_data)
    
    if response.status_code in [200, 201]:
        data = response.json()
        # Check if tokens are returned (they shouldn't be)
        if 'tokens' in data:
            print("  ❌ Registration returns tokens (auto-login issue)")
            return None
        else:
            print("  ✅ Registration successful, no auto-login")
            return user_data
    else:
        print(f"  ❌ Registration failed: {response.status_code}")
        print(f"     {response.text}")
        return None

def test_login(user_data):
    """Test user login"""
    print("\n2. Testing Login...")
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login/", json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        if 'tokens' in data:
            print("  ✅ Login successful, tokens received")
            return data['tokens']['access']
        else:
            print("  ❌ Login successful but no tokens returned")
            return None
    else:
        print(f"  ❌ Login failed: {response.status_code}")
        return None

def test_profile_update(token):
    """Test profile update persistence"""
    print("\n3. Testing Profile Update...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get current profile
    response = requests.get(f"{BASE_URL}/api/auth/profile/", headers=headers)
    if response.status_code != 200:
        print(f"  ❌ Failed to get profile: {response.status_code}")
        return False
    
    # Update profile
    update_data = {
        "bio": "Test bio updated at " + str(time.time()),
        "skills": ["Python", "Django", "React"],
        "github_username": "testuser"
    }
    
    response = requests.put(f"{BASE_URL}/api/auth/profile/", json=update_data, headers=headers)
    if response.status_code == 200:
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/auth/profile/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data.get('bio') == update_data['bio']:
                print("  ✅ Profile update persisted")
                return True
            else:
                print("  ❌ Profile update not persisted")
                return False
    else:
        print(f"  ❌ Profile update failed: {response.status_code}")
        return False

def test_community_post(token):
    """Test community post creation and persistence"""
    print("\n4. Testing Community Posts...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a post
    post_data = {
        "content": "Test post at " + str(time.time()),
        "post_type": "text"
    }
    
    response = requests.post(f"{BASE_URL}/api/community/posts/", json=post_data, headers=headers)
    if response.status_code in [200, 201]:
        post_id = response.json()['id']
        print(f"  ✅ Post created with ID: {post_id}")
        
        # Fetch posts to verify persistence
        response = requests.get(f"{BASE_URL}/api/community/posts/", headers=headers)
        if response.status_code == 200:
            posts = response.json()
            if any(p['id'] == post_id for p in posts.get('results', posts)):
                print("  ✅ Post persisted in database")
                
                # Test like functionality
                response = requests.post(f"{BASE_URL}/api/community/posts/{post_id}/like/", headers=headers)
                if response.status_code == 200:
                    print("  ✅ Like functionality working")
                else:
                    print(f"  ❌ Like failed: {response.status_code}")
                
                return post_id
            else:
                print("  ❌ Post not found after creation")
                return None
    else:
        print(f"  ❌ Post creation failed: {response.status_code}")
        return None

def test_ai_chat(token):
    """Test AI chat functionality"""
    print("\n5. Testing AI Chat...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check if Gemini API key is configured
    env_path = r"C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend\.env"
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            content = f.read()
            if 'GOOGLE_GEMINI_API_KEY=' in content and 'AIzaSy' in content:
                print("  ✅ Gemini API key found in .env")
            else:
                print("  ❌ Gemini API key not properly configured")
    
    # Create AI session
    session_data = {
        "session_type": "general_chat"
    }
    
    response = requests.post(f"{BASE_URL}/api/ai/sessions/", json=session_data, headers=headers)
    if response.status_code in [200, 201]:
        session_id = response.json()['id']
        print(f"  ✅ AI session created with ID: {session_id}")
        
        # Send message
        message_data = {"message": "Hello, can you help me with Python?"}
        response = requests.post(f"{BASE_URL}/api/ai/sessions/{session_id}/send_message/", 
                                json=message_data, headers=headers)
        
        if response.status_code == 200:
            ai_response = response.json()
            if 'ai_response' in ai_response:
                ai_text = ai_response['ai_response']['message']
                if "API key" not in ai_text and "Error" not in ai_text:
                    print("  ✅ AI responded successfully")
                    print(f"     AI: {ai_text[:100]}...")
                else:
                    print(f"  ❌ AI error: {ai_text}")
            else:
                print("  ❌ No AI response received")
        else:
            print(f"  ❌ Message send failed: {response.status_code}")
    else:
        print(f"  ❌ Session creation failed: {response.status_code}")

def test_routes():
    """Test if all frontend routes are accessible"""
    print("\n6. Testing Frontend Routes...")
    routes = ["/", "/login", "/register", "/learning", "/projects", "/community", "/profile"]
    
    all_good = True
    for route in routes:
        try:
            response = requests.get(f"http://localhost:3000{route}", timeout=5)
            if response.status_code == 200 and '<div id="root">' in response.text:
                print(f"  ✅ {route} - Accessible")
            else:
                print(f"  ❌ {route} - Not rendering properly")
                all_good = False
        except:
            print(f"  ❌ {route} - Error accessing")
            all_good = False
    
    return all_good

def main():
    print("=" * 60)
    print("CCIS-CodeHub Comprehensive Feature Test")
    print("=" * 60)
    
    # Test registration
    user_data = test_registration()
    if not user_data:
        print("\n❌ Registration test failed. Stopping tests.")
        return
    
    # Wait a moment
    time.sleep(1)
    
    # Test login
    token = test_login(user_data)
    if not token:
        print("\n❌ Login test failed. Stopping tests.")
        return
    
    # Test profile update
    test_profile_update(token)
    
    # Test community posts
    test_community_post(token)
    
    # Test AI chat
    test_ai_chat(token)
    
    # Test frontend routes
    test_routes()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("Please review the results above to identify issues.")
    print("=" * 60)

if __name__ == "__main__":
    main()
