import os
import django
import sys
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User

def run_test():
    print("Setting up test users...")
    # Create standard user
    user, _ = User.objects.get_or_create(username='leak_tester', email='leak@test.com')
    if not user.check_password('password123'):
        user.set_password('password123')
        user.save()
    
    # Create admin user
    admin, _ = User.objects.get_or_create(username='admin_tester', email='admin@test.com', role='admin', is_staff=True, is_superuser=True)
    if not admin.check_password('password123'):
        admin.set_password('password123')
        admin.save()

    client = APIClient()
    
    # Test 1: Standard User Accessing User List
    print("\n--- TEST 1: Standard User Accessing User List ---")
    client.force_authenticate(user=user)
    
    # Try different potential endpoints
    endpoints = ['/api/auth/users/', '/api/accounts/users/', '/api/users/']
    
    for endpoint in endpoints:
        print(f"Testing {endpoint}...")
        response = client.get(endpoint)
        
        if response.status_code == 404:
            print(f"Endpoint {endpoint} not found.")
            continue
            
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                print("VULNERABLE: Returned list of users!")
                first_user = data[0]
                print("Leaked fields:", list(first_user.keys()))
                if 'email' in first_user:
                    print("⚠️  EMAIL LEAKED: Yes")
                if 'profile' in first_user:
                    print("⚠️  FULL PROFILE LEAKED: Yes")
                return # Stop after finding the leak
            elif isinstance(data, dict) and 'results' in data:
                 print("VULNERABLE: Returned paginated list of users!")
                 first_user = data['results'][0]
                 print("Leaked fields:", list(first_user.keys()))
                 return
        else:
            print(f"Secure? Response: {response.status_code}")

    # Test 2: Admin Accessing User List
    print("\n--- TEST 2: Admin Accessing User List ---")
    client.force_authenticate(user=admin)
    # Assuming we found the endpoint in loop above, but let's try the first one that worked or default
    endpoint = '/api/auth/users/' 
    print(f"Testing {endpoint} as Admin...")
    response = client.get(endpoint)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Admin access working as expected.")

if __name__ == "__main__":
    run_test()
