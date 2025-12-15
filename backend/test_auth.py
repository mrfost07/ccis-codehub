"""
Test authentication endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_register():
    """Test user registration"""
    print("Testing Registration...")
    url = f"{BASE_URL}/auth/register/"
    data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPass123!",
        "confirm_password": "TestPass123!",
        "role": "student"
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json()
    return None

def test_login():
    """Test user login"""
    print("\nTesting Login...")
    url = f"{BASE_URL}/auth/login/"
    data = {
        "email": "test@example.com",
        "password": "TestPass123!"
    }
    
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        return response.json()
    return None

def test_profile(token):
    """Test profile endpoint"""
    print("\nTesting Profile...")
    url = f"{BASE_URL}/auth/profile/"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    print("=" * 50)
    print("Testing CCIS-CodeHub Authentication")
    print("=" * 50)
    
    # Test registration
    register_result = test_register()
    
    # Test login
    login_result = test_login()
    
    # Test profile if login successful
    if login_result and 'tokens' in login_result:
        token = login_result['tokens']['access']
        test_profile(token)
    
    print("\n" + "=" * 50)
    print("Tests Complete!")
