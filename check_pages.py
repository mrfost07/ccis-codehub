"""
Frontend Page Checker
Verifies all pages exist and are properly configured
"""

import os
import re

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'src')
pages_dir = os.path.join(frontend_dir, 'pages')

# Expected pages
EXPECTED_PAGES = [
    'Home.tsx',
    'Login.tsx',
    'Register.tsx',
    'Dashboard.tsx',
    'AdminDashboard.tsx',
    'InstructorDashboard.tsx',
    'StudentDashboard.tsx',
    'LearningAdmin.tsx',
    'LearningEnhanced.tsx',
    'Learning.tsx',
    'CommunityEnhanced.tsx',
    'Community.tsx',
    'ProjectsEnhanced.tsx',
    'Projects.tsx',
    'Profile.tsx',
    'ProfileEnhanced.tsx',
    'AIChatInterface.tsx',
    'AIMentor.tsx',
    'QuizTaking.tsx',
    'QuestionManagement.tsx',
]

# Expected API imports
API_PATTERNS = [
    r'from\s+[\'"]\.\.\/services\/api[\'"]',
    r'import\s+.*\s+from\s+[\'"]\.\.\/services\/api[\'"]',
    r'import\s+api',
    r'import\s+\{.*API.*\}',
]

def check_file_exists(filepath):
    """Check if file exists"""
    return os.path.exists(filepath)

def check_api_import(filepath):
    """Check if file imports API service"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            for pattern in API_PATTERNS:
                if re.search(pattern, content):
                    return True
        return False
    except Exception as e:
        return False

def check_api_calls(filepath):
    """Check if file makes API calls"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            # Look for common API call patterns
            patterns = [
                r'\.get\(',
                r'\.post\(',
                r'\.put\(',
                r'\.delete\(',
                r'API\.',
                r'await\s+\w+API\.',
            ]
            for pattern in patterns:
                if re.search(pattern, content):
                    return True
        return False
    except Exception as e:
        return False

def print_success(text):
    print(f"{Colors.GREEN}[OK]{Colors.END} {text}")

def print_error(text):
    print(f"{Colors.RED}[FAIL]{Colors.END} {text}")

def print_warning(text):
    print(f"{Colors.YELLOW}[WARN]{Colors.END} {text}")

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def main():
    print(f"\n{Colors.BOLD}CCIS-CodeHub Frontend Page Checker{Colors.END}\n")
    
    # Check if pages directory exists
    if not os.path.exists(pages_dir):
        print_error(f"Pages directory not found: {pages_dir}")
        return
    
    print_header("CHECKING PAGE FILES")
    
    existing_pages = []
    missing_pages = []
    
    for page in EXPECTED_PAGES:
        filepath = os.path.join(pages_dir, page)
        if check_file_exists(filepath):
            print_success(f"{page} exists")
            existing_pages.append(page)
        else:
            print_error(f"{page} MISSING")
            missing_pages.append(page)
    
    print_header("CHECKING BACKEND CONNECTIVITY")
    
    pages_with_api = []
    pages_without_api = []
    
    # Pages that should have API calls
    pages_needing_api = [
        'AdminDashboard.tsx',
        'InstructorDashboard.tsx',
        'StudentDashboard.tsx',
        'LearningAdmin.tsx',
        'LearningEnhanced.tsx',
        'CommunityEnhanced.tsx',
        'ProjectsEnhanced.tsx',
        'Profile.tsx',
        'ProfileEnhanced.tsx',
        'Login.tsx',
        'Register.tsx',
    ]
    
    for page in pages_needing_api:
        if page in existing_pages:
            filepath = os.path.join(pages_dir, page)
            has_import = check_api_import(filepath)
            has_calls = check_api_calls(filepath)
            
            if has_import and has_calls:
                print_success(f"{page} - Connected to backend")
                pages_with_api.append(page)
            elif has_import:
                print_warning(f"{page} - Has API import but no calls found")
                pages_with_api.append(page)
            elif has_calls:
                print_warning(f"{page} - Has API calls but may not import properly")
                pages_with_api.append(page)
            else:
                print_error(f"{page} - NOT connected to backend")
                pages_without_api.append(page)
    
    # Check App.tsx routes
    print_header("CHECKING ROUTES CONFIGURATION")
    
    app_file = os.path.join(frontend_dir, 'App.tsx')
    if os.path.exists(app_file):
        print_success("App.tsx exists")
        
        with open(app_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Check for route definitions
            routes_to_check = [
                ('/', 'Home'),
                ('/login', 'Login'),
                ('/register', 'Register'),
                ('/dashboard', 'Dashboard'),
                ('/admin', 'AdminDashboard'),
                ('/instructor', 'InstructorDashboard'),
                ('/student', 'StudentDashboard'),
                ('/learning-admin', 'LearningAdmin'),
                ('/learning', 'Learning'),
                ('/community', 'Community'),
                ('/projects', 'Projects'),
                ('/profile', 'Profile'),
            ]
            
            for path, component in routes_to_check:
                if f'path="{path}"' in content or f"path='{path}'" in content:
                    print_success(f"Route {path} -> {component}")
                else:
                    print_warning(f"Route {path} may not be configured")
    else:
        print_error("App.tsx not found!")
    
    # Summary
    print_header("SUMMARY")
    
    print(f"{Colors.BOLD}Pages:{Colors.END}")
    print(f"  Total expected: {len(EXPECTED_PAGES)}")
    print(f"  {Colors.GREEN}Existing: {len(existing_pages)}{Colors.END}")
    if missing_pages:
        print(f"  {Colors.RED}Missing: {len(missing_pages)}{Colors.END}")
    
    print(f"\n{Colors.BOLD}Backend Connectivity:{Colors.END}")
    print(f"  Pages needing API: {len(pages_needing_api)}")
    print(f"  {Colors.GREEN}Connected: {len(pages_with_api)}{Colors.END}")
    if pages_without_api:
        print(f"  {Colors.RED}Not connected: {len(pages_without_api)}{Colors.END}")
        for page in pages_without_api:
            print(f"    - {page}")
    
    if not missing_pages and not pages_without_api:
        print(f"\n{Colors.GREEN}{Colors.BOLD}SUCCESS: All pages exist and are connected!{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}WARNING: Some issues found{Colors.END}")

if __name__ == '__main__':
    main()
