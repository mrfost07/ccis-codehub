"""
Comprehensive test script for CCIS-CodeHub
Tests all backend API endpoints and their connectivity
"""

import sys
import requests
from typing import Dict, List, Tuple

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def print_success(text: str):
    print(f"{Colors.GREEN}[OK]{Colors.END} {text}")

def print_error(text: str):
    print(f"{Colors.RED}[FAIL]{Colors.END} {text}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}[WARN]{Colors.END} {text}")

def test_endpoint(method: str, endpoint: str, description: str, token: str = None, data: dict = None) -> Tuple[bool, int]:
    """Test a single API endpoint"""
    url = f"{API_BASE}{endpoint}"
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=5)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=5)
        else:
            response = requests.request(method, url, headers=headers, timeout=5)
        
        status = response.status_code
        if status < 400:
            print_success(f"{description}: {status}")
            return True, status
        elif status == 401:
            print_warning(f"{description}: {status} (Auth required)")
            return True, status  # Expected for protected routes
        else:
            print_error(f"{description}: {status}")
            return False, status
    except requests.exceptions.ConnectionError:
        print_error(f"{description}: Connection refused - Is backend running?")
        return False, 0
    except requests.exceptions.Timeout:
        print_error(f"{description}: Timeout")
        return False, 0
    except Exception as e:
        print_error(f"{description}: {str(e)}")
        return False, 0

def test_authentication() -> str:
    """Test authentication and return token"""
    print_header("AUTHENTICATION TESTS")
    
    # Test registration endpoint
    test_endpoint('POST', '/auth/register/', 'Registration endpoint')
    
    # Test login endpoint
    test_endpoint('POST', '/auth/login/', 'Login endpoint')
    
    # Try to get a token with admin credentials
    try:
        response = requests.post(
            f"{API_BASE}/auth/login/",
            json={
                "email": "fostanesmarkrenier@gmail.com",
                "password": "Admin@123"
            },
            timeout=5
        )
        if response.status_code == 200:
            token = response.json().get('access') or response.json().get('token') or response.json().get('tokens', {}).get('access')
            if token:
                print_success(f"Login successful - Token obtained")
                return token
            else:
                print_warning("Login returned 200 but no token found")
        else:
            print_warning(f"Login failed with status {response.status_code}")
    except Exception as e:
        print_warning(f"Could not obtain token: {str(e)}")
    
    return None

def test_learning_endpoints(token: str = None):
    """Test learning module endpoints"""
    print_header("LEARNING MODULE ENDPOINTS")
    
    endpoints = [
        ('GET', '/learning/career-paths/', 'Career paths list'),
        ('GET', '/learning/modules/', 'Learning modules list'),
        ('GET', '/learning/quizzes/', 'Quizzes list'),
        ('GET', '/learning/progress/', 'User progress (auth)'),
        ('GET', '/learning/certificates/', 'Certificates (auth)'),
        ('GET', '/learning/enrollments/', 'Enrollments (auth)'),
        ('GET', '/learning/admin/career-paths/', 'Admin career paths (auth)'),
        ('GET', '/learning/admin/modules/', 'Admin modules (auth)'),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        success, status = test_endpoint(method, endpoint, description, token)
        results.append((description, success, status))
    
    return results

def test_community_endpoints(token: str = None):
    """Test community endpoints"""
    print_header("COMMUNITY ENDPOINTS")
    
    endpoints = [
        ('GET', '/community/posts/', 'Posts list'),
        ('GET', '/community/comments/', 'Comments list'),
        ('GET', '/community/hashtags/', 'Hashtags list'),
        ('GET', '/community/notifications/', 'Notifications (auth)'),
        ('GET', '/community/follows/', 'Follows list'),
        ('GET', '/community/badges/', 'Badges list'),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        success, status = test_endpoint(method, endpoint, description, token)
        results.append((description, success, status))
    
    return results

def test_projects_endpoints(token: str = None):
    """Test projects endpoints"""
    print_header("PROJECTS ENDPOINTS")
    
    endpoints = [
        ('GET', '/projects/projects/', 'Projects list'),
        ('GET', '/projects/tasks/', 'Tasks list'),
        ('GET', '/projects/reviews/', 'Code reviews list'),
        ('GET', '/projects/comments/', 'Review comments list'),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        success, status = test_endpoint(method, endpoint, description, token)
        results.append((description, success, status))
    
    return results

def test_ai_endpoints(token: str = None):
    """Test AI mentor endpoints"""
    print_header("AI MENTOR ENDPOINTS")
    
    endpoints = [
        ('GET', '/ai/sessions/', 'AI sessions (auth)'),
        ('GET', '/ai/code-analysis/', 'Code analysis list'),
        ('GET', '/ai/recommendations/', 'Recommendations (auth)'),
        ('GET', '/ai/models/', 'AI models config'),
        ('GET', '/ai/settings/', 'AI settings (auth)'),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        success, status = test_endpoint(method, endpoint, description, token)
        results.append((description, success, status))
    
    return results

def test_admin_endpoints(token: str = None):
    """Test admin endpoints"""
    print_header("ADMIN ENDPOINTS")
    
    endpoints = [
        ('GET', '/auth/admin/dashboard/', 'Admin dashboard (auth)'),
        ('GET', '/auth/admin/users/', 'Admin users management (auth)'),
        ('GET', '/auth/admin/content/', 'Admin content management (auth)'),
        ('GET', '/auth/profile/', 'User profile (auth)'),
        ('GET', '/auth/stats/', 'User stats (auth)'),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        success, status = test_endpoint(method, endpoint, description, token)
        results.append((description, success, status))
    
    return results

def test_health_check():
    """Test basic connectivity"""
    print_header("HEALTH CHECK")
    
    endpoints = [
        ('GET', '/', 'Root endpoint'),
        ('GET', '/health/', 'Health check'),
    ]
    
    results = []
    for method, endpoint, description in endpoints:
        success, status = test_endpoint(method, endpoint, description)
        results.append((description, success, status))
    
    return results

def print_summary(all_results: Dict[str, List[Tuple]]):
    """Print test summary"""
    print_header("TEST SUMMARY")
    
    total_tests = 0
    passed_tests = 0
    
    for category, results in all_results.items():
        total = len(results)
        passed = sum(1 for _, success, _ in results if success)
        total_tests += total
        passed_tests += passed
        
        if passed == total:
            print_success(f"{category}: {passed}/{total} passed")
        else:
            print_warning(f"{category}: {passed}/{total} passed")
    
    print(f"\n{Colors.BOLD}Overall: {passed_tests}/{total_tests} tests passed{Colors.END}")
    
    if passed_tests == total_tests:
        print(f"\n{Colors.GREEN}{Colors.BOLD}SUCCESS: ALL TESTS PASSED!{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}WARNING: Some tests failed - check backend status{Colors.END}")

def main():
    print(f"\n{Colors.BOLD}CCIS-CodeHub Backend API Test Suite{Colors.END}")
    print(f"{Colors.BOLD}Testing backend at: {BASE_URL}{Colors.END}\n")
    
    # Test health first
    health_results = test_health_check()
    
    # Check if backend is running
    if not any(success for _, success, _ in health_results):
        print_error("\nBackend is not running!")
        print_warning("\nPlease start the backend server:")
        print("   cd backend")
        print("   python manage.py runserver")
        sys.exit(1)
    
    # Authenticate and get token
    token = test_authentication()
    
    # Run all endpoint tests
    all_results = {
        'Health Check': health_results,
        'Learning': test_learning_endpoints(token),
        'Community': test_community_endpoints(token),
        'Projects': test_projects_endpoints(token),
        'AI Mentor': test_ai_endpoints(token),
        'Admin': test_admin_endpoints(token),
    }
    
    # Print summary
    print_summary(all_results)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Tests interrupted by user{Colors.END}")
        sys.exit(0)
