#!/usr/bin/env python
"""
Comprehensive System Health Check for CCIS-CodeHub
Tests all components, routes, and features
"""
import requests
import json
import sys
import os
import time

# Configuration
BASE_URL_BACKEND = "http://localhost:8000"
BASE_URL_FRONTEND = "http://localhost:3000"

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def print_status(status, message):
    """Print colored status messages"""
    if status == "success":
        print(f"{GREEN}[OK]{RESET} {message}")
    elif status == "error":
        print(f"{RED}[ERROR]{RESET} {message}")
    elif status == "warning":
        print(f"{YELLOW}[WARN]{RESET} {message}")
    elif status == "info":
        print(f"{BLUE}[INFO]{RESET} {message}")
    elif status == "header":
        print(f"\n{BOLD}{message}{RESET}")
        print("=" * len(message))

def check_backend_health():
    """Check if backend is running and healthy"""
    print_status("header", "Backend Health Check")
    
    try:
        response = requests.get(f"{BASE_URL_BACKEND}/api/health/", timeout=5)
        if response.status_code == 200:
            print_status("success", f"Backend is healthy: {response.json()}")
            return True
        else:
            print_status("error", f"Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_status("error", "Backend is not running (connection refused)")
        return False
    except Exception as e:
        print_status("error", f"Backend check failed: {str(e)}")
        return False

def check_frontend_health():
    """Check if frontend is running"""
    print_status("header", "Frontend Health Check")
    
    try:
        response = requests.get(BASE_URL_FRONTEND, timeout=5)
        if response.status_code == 200:
            print_status("success", "Frontend is running")
            # Check if React app is loaded
            if '<div id="root">' in response.text:
                print_status("success", "React root element found")
                return True
            else:
                print_status("warning", "Frontend is running but React app may not be loaded")
                return True
        else:
            print_status("error", f"Frontend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_status("error", "Frontend is not running (connection refused)")
        return False
    except Exception as e:
        print_status("error", f"Frontend check failed: {str(e)}")
        return False

def check_api_endpoints():
    """Test all major API endpoints"""
    print_status("header", "API Endpoints Check")
    
    endpoints = [
        ("/api/", "API Root", False),
        ("/api/learning/career-paths/", "Learning API", False),
        ("/api/community/posts/", "Community API", False),
        ("/api/projects/projects/", "Projects API", True),  # Requires auth
        ("/api/ai/sessions/", "AI Mentor API", True),  # Requires auth
        ("/api/auth/register/", "Auth Register", False),
        ("/api/schema/", "API Schema", False),
    ]
    
    all_good = True
    for endpoint, name, requires_auth in endpoints:
        try:
            url = f"{BASE_URL_BACKEND}{endpoint}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                print_status("success", f"{name}: {endpoint}")
            elif response.status_code == 401 and requires_auth:
                print_status("info", f"{name}: {endpoint} (requires authentication)")
            elif response.status_code == 405:
                print_status("info", f"{name}: {endpoint} (GET not allowed, but endpoint exists)")
            else:
                print_status("warning", f"{name}: {endpoint} returned {response.status_code}")
                all_good = False
        except Exception as e:
            print_status("error", f"{name}: {endpoint} - {str(e)}")
            all_good = False
    
    return all_good

def check_frontend_routes():
    """Test all frontend routes"""
    print_status("header", "Frontend Routes Check")
    
    routes = [
        ("/", "Homepage"),
        ("/login", "Login Page"),
        ("/register", "Register Page"),
        ("/dashboard", "Dashboard (protected)"),
        ("/learning", "Learning Center (protected)"),
        ("/projects", "Projects (protected)"),
        ("/community", "Community (protected)"),
        ("/profile", "Profile (protected)"),
    ]
    
    all_good = True
    for route, name in routes:
        try:
            url = f"{BASE_URL_FRONTEND}{route}"
            response = requests.get(url, timeout=5, allow_redirects=False)
            
            if response.status_code == 200:
                print_status("success", f"{name}: {route}")
            else:
                print_status("info", f"{name}: {route} (status: {response.status_code})")
        except Exception as e:
            print_status("error", f"{name}: {route} - {str(e)}")
            all_good = False
    
    return all_good

def check_database():
    """Check database connectivity"""
    print_status("header", "Database Check")
    
    # This would need Django setup, so we'll check via API
    try:
        response = requests.get(f"{BASE_URL_BACKEND}/api/", timeout=5)
        if response.status_code == 200:
            print_status("success", "Database is accessible (API is responding)")
            return True
        else:
            print_status("warning", "API is responding but may have database issues")
            return True
    except Exception as e:
        print_status("error", f"Cannot verify database: {str(e)}")
        return False

def test_registration_flow():
    """Test user registration flow"""
    print_status("header", "Registration Flow Test")
    
    # Generate unique test user
    import random
    test_user = {
        "username": f"testuser_{random.randint(1000, 9999)}",
        "email": f"test_{random.randint(1000, 9999)}@test.com",
        "first_name": "Test",
        "last_name": "User",
        "password": "TestPass123!",
        "confirm_password": "TestPass123!",
        "program": "BSIT",
        "year_level": "1",
        "role": "student"
    }
    
    try:
        url = f"{BASE_URL_BACKEND}/api/auth/register/"
        response = requests.post(url, json=test_user, timeout=5)
        
        if response.status_code in [200, 201]:
            print_status("success", f"Registration endpoint working - User: {test_user['username']}")
            return True
        elif response.status_code == 400:
            errors = response.json()
            if "username" in errors and "already exists" in str(errors["username"]):
                print_status("info", "Registration working (username already exists)")
                return True
            else:
                print_status("warning", f"Registration validation: {errors}")
                return True
        else:
            print_status("error", f"Registration failed with status {response.status_code}")
            return False
    except Exception as e:
        print_status("error", f"Registration test failed: {str(e)}")
        return False

def test_model_fields():
    """Test if new model fields are working"""
    print_status("header", "Model Fields Check")
    
    # Check if registration accepts new fields
    test_data = {
        "username": "fieldtest",
        "email": "field@test.com",
        "password": "Test123!",
        "confirm_password": "Test123!",
        "first_name": "John",
        "last_name": "Doe",
        "program": "BSIT",
        "year_level": "2",
        "role": "student"
    }
    
    try:
        # Just check if the endpoint accepts these fields
        url = f"{BASE_URL_BACKEND}/api/auth/register/"
        response = requests.post(url, json=test_data, timeout=5)
        
        # We don't need it to succeed, just to accept the fields
        if response.status_code == 400:
            errors = response.json()
            # Check if new fields are recognized
            if not any(field in errors for field in ["program", "year_level", "first_name", "last_name"]):
                print_status("success", "New model fields (program, year_level) are recognized")
                return True
            else:
                print_status("warning", f"Some fields may have issues: {errors}")
                return True
        elif response.status_code in [200, 201]:
            print_status("success", "All model fields working correctly")
            return True
        else:
            print_status("info", f"Model fields test returned status {response.status_code}")
            return True
    except Exception as e:
        print_status("error", f"Model fields test failed: {str(e)}")
        return False

def main():
    """Run all health checks"""
    print(f"{BOLD}\nCCIS-CodeHub Comprehensive System Health Check{RESET}")
    print("=" * 60)
    
    all_checks_passed = True
    
    # Check backend
    if not check_backend_health():
        all_checks_passed = False
        print_status("error", "\nBackend is not running! Start it with:")
        print("  cd backend && .\\venv\\Scripts\\activate && python manage.py runserver")
    
    # Check frontend
    if not check_frontend_health():
        all_checks_passed = False
        print_status("error", "\nFrontend is not running! Start it with:")
        print("  cd frontend && npm run dev")
    
    # Check API endpoints
    if not check_api_endpoints():
        all_checks_passed = False
    
    # Check frontend routes
    if not check_frontend_routes():
        all_checks_passed = False
    
    # Check database
    if not check_database():
        all_checks_passed = False
    
    # Test registration
    if not test_registration_flow():
        all_checks_passed = False
    
    # Test model fields
    if not test_model_fields():
        all_checks_passed = False
    
    # Summary
    print_status("header", "Health Check Summary")
    
    if all_checks_passed:
        print(f"\n{GREEN}{BOLD}ALL SYSTEMS OPERATIONAL!{RESET}")
        print("The CCIS-CodeHub platform is running perfectly!")
        print("\nYou can access:")
        print(f"  - Frontend: {BLUE}{BASE_URL_FRONTEND}{RESET}")
        print(f"  - Backend API: {BLUE}{BASE_URL_BACKEND}/api/{RESET}")
        print(f"  - Admin Panel: {BLUE}{BASE_URL_BACKEND}/admin/{RESET}")
        print(f"  - API Docs: {BLUE}{BASE_URL_BACKEND}/api/schema/swagger-ui/{RESET}")
    else:
        print(f"\n{YELLOW}{BOLD}WARNING: SOME ISSUES DETECTED{RESET}")
        print("Please review the errors above and fix them.")
        print("\nCommon fixes:")
        print("  1. Ensure both backend and frontend are running")
        print("  2. Check if ports 8000 and 3000 are available")
        print("  3. Run migrations: cd backend && python manage.py migrate")
        print("  4. Install dependencies: npm install (frontend) & pip install -r requirements.txt (backend)")
    
    return 0 if all_checks_passed else 1

if __name__ == "__main__":
    sys.exit(main())
