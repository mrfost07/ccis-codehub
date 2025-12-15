"""
File Upload Functionality Test Script
Tests all file upload endpoints in CCIS-CodeHub
"""

import os
import sys
import requests
import io
from typing import Dict, Tuple

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

def get_auth_token() -> str:
    """Get authentication token"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/login/",
            json={
                "email": "fostanesmarkrenier@gmail.com",
                "password": "Admin@123"
            },
            timeout=10
        )
        if response.status_code == 200:
            token = response.json().get('access') or response.json().get('token') or response.json().get('tokens', {}).get('access')
            if token:
                print_success("Authentication successful")
                return token
        print_error(f"Login failed with status {response.status_code}")
    except Exception as e:
        print_error(f"Authentication failed: {str(e)}")
    return None

def create_test_image() -> io.BytesIO:
    """Create a simple test image (PNG format)"""
    # Create a minimal 1x1 PNG image
    png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    return io.BytesIO(png_data)

def create_test_pdf() -> io.BytesIO:
    """Create a simple test PDF"""
    pdf_content = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF'
    return io.BytesIO(pdf_content)

def create_test_text() -> io.BytesIO:
    """Create a simple test text file"""
    text_content = b"""# Introduction to Programming

## Overview
This module covers basic programming concepts.

## Topics:
1. Variables and Data Types
2. Control Structures
3. Functions
4. Object-Oriented Programming

## Learning Objectives
- Understand variables
- Write basic programs
- Use functions effectively
"""
    return io.BytesIO(text_content)

def test_profile_picture_upload(token: str) -> Tuple[bool, str]:
    """Test profile picture upload"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        files = {
            'profile_picture': ('test_avatar.png', create_test_image(), 'image/png')
        }
        
        response = requests.put(
            f"{API_BASE}/auth/profile/",
            headers=headers,
            files=files,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            if 'profile_picture' in str(data) or 'profile' in str(data):
                return True, f"Profile picture uploaded successfully (status: {response.status_code})"
            else:
                return True, f"Request successful but profile_picture field not in response (status: {response.status_code})"
        else:
            return False, f"Upload failed with status {response.status_code}: {response.text[:100]}"
            
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_community_post_image(token: str) -> Tuple[bool, str]:
    """Test community post with image"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        files = {
            'image': ('test_post.png', create_test_image(), 'image/png')
        }
        data = {
            'content': 'Test post with image upload'
        }
        
        response = requests.post(
            f"{API_BASE}/community/posts/",
            headers=headers,
            data=data,
            files=files,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            return True, f"Post image uploaded successfully (status: {response.status_code})"
        else:
            return False, f"Upload failed with status {response.status_code}: {response.text[:100]}"
            
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_module_file_upload(token: str) -> Tuple[bool, str]:
    """Test learning module file upload"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        # First, get a career path to associate the module with
        career_paths_response = requests.get(
            f"{API_BASE}/learning/career-paths/",
            headers=headers,
            timeout=10
        )
        
        if career_paths_response.status_code != 200:
            return False, f"Could not fetch career paths (status: {career_paths_response.status_code})"
        
        paths_data = career_paths_response.json()
        paths = paths_data.get('results', paths_data) if isinstance(paths_data, dict) else paths_data
        
        if not paths or len(paths) == 0:
            return False, "No career paths available. Create a career path first."
        
        career_path_id = paths[0]['id']
        
        # Upload module file
        files = {
            'module_file': ('test_module.txt', create_test_text(), 'text/plain')
        }
        data = {
            'career_path': career_path_id,
            'title': 'Test Module with File Upload',
            'description': 'Testing file upload functionality',
            'module_type': 'text',
            'difficulty_level': 'beginner',
            'content': 'Test content',
            'duration_minutes': '30',
            'points_reward': '10',
            'order': '999'
        }
        
        response = requests.post(
            f"{API_BASE}/learning/admin/modules/",
            headers=headers,
            data=data,
            files=files,
            timeout=15
        )
        
        if response.status_code in [200, 201]:
            return True, f"Module file uploaded successfully (status: {response.status_code})"
        elif response.status_code == 403:
            return False, f"Permission denied. User needs admin/instructor role."
        else:
            return False, f"Upload failed with status {response.status_code}: {response.text[:200]}"
            
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_project_file_upload(token: str) -> Tuple[bool, str]:
    """Test project file upload"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        # First create a project
        project_data = {
            'title': 'Test Project for File Upload',
            'description': 'Testing project file uploads',
            'status': 'active',
            'visibility': 'public'
        }
        
        project_response = requests.post(
            f"{API_BASE}/projects/projects/",
            headers=headers,
            json=project_data,
            timeout=10
        )
        
        if project_response.status_code not in [200, 201]:
            return False, f"Could not create project (status: {project_response.status_code})"
        
        project_id = project_response.json()['id']
        
        # Upload file to project
        files = {
            'file': ('test_document.txt', create_test_text(), 'text/plain')
        }
        data = {
            'project': project_id,
            'name': 'Test Document',
            'description': 'Test file upload'
        }
        
        response = requests.post(
            f"{API_BASE}/projects/files/",
            headers=headers,
            data=data,
            files=files,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            return True, f"Project file uploaded successfully (status: {response.status_code})"
        else:
            return False, f"Upload failed with status {response.status_code}: {response.text[:100]}"
            
    except Exception as e:
        return False, f"Exception: {str(e)}"

def test_certificate_template_upload(token: str) -> Tuple[bool, str]:
    """Test certificate template upload for career path"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        
        files = {
            'certificate_template': ('certificate.pdf', create_test_pdf(), 'application/pdf')
        }
        data = {
            'name': 'Test Career Path with Certificate',
            'description': 'Testing certificate upload',
            'program_type': 'general',
            'difficulty_level': 'beginner',
            'estimated_duration_weeks': '4',
            'is_active': 'true'
        }
        
        response = requests.post(
            f"{API_BASE}/learning/admin/career-paths/",
            headers=headers,
            data=data,
            files=files,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            return True, f"Certificate template uploaded successfully (status: {response.status_code})"
        elif response.status_code == 403:
            return False, f"Permission denied. User needs admin/instructor role."
        else:
            return False, f"Upload failed with status {response.status_code}: {response.text[:100]}"
            
    except Exception as e:
        return False, f"Exception: {str(e)}"

def check_media_directories():
    """Check if media directories exist"""
    print_header("MEDIA DIRECTORIES CHECK")
    
    media_root = os.path.join(os.path.dirname(__file__), 'backend', 'media')
    
    directories = [
        'profile_pictures',
        'post_images',
        'module_files',
        'project_files',
        'certificates/templates'
    ]
    
    all_exist = True
    for directory in directories:
        dir_path = os.path.join(media_root, directory)
        if os.path.exists(dir_path):
            print_success(f"{directory}/ exists")
        else:
            print_warning(f"{directory}/ does not exist (will be created on first upload)")
            all_exist = False
    
    return all_exist

def main():
    print(f"\n{Colors.BOLD}CCIS-CodeHub File Upload Test Suite{Colors.END}")
    print(f"{Colors.BOLD}Testing uploads at: {BASE_URL}{Colors.END}\n")
    
    # Check media directories
    check_media_directories()
    
    # Authenticate
    print_header("AUTHENTICATION")
    token = get_auth_token()
    
    if not token:
        print_error("\nCannot proceed without authentication!")
        print_warning("Make sure:")
        print("  1. Backend is running (python manage.py runserver)")
        print("  2. Admin user exists with credentials:")
        print("     Email: fostanesmarkrenier@gmail.com")
        print("     Password: Admin@123")
        sys.exit(1)
    
    # Run upload tests
    print_header("FILE UPLOAD TESTS")
    
    tests = [
        ("Profile Picture Upload", test_profile_picture_upload),
        ("Community Post Image", test_community_post_image),
        ("Module File Upload", test_module_file_upload),
        ("Project File Upload", test_project_file_upload),
        ("Certificate Template", test_certificate_template_upload),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{Colors.BOLD}Testing: {test_name}{Colors.END}")
        success, message = test_func(token)
        results.append((test_name, success))
        
        if success:
            print_success(message)
        else:
            print_error(message)
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        if success:
            print_success(f"{test_name}")
        else:
            print_error(f"{test_name}")
    
    print(f"\n{Colors.BOLD}Overall: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}SUCCESS: All upload tests passed!{Colors.END}")
        print("\nFile upload functionality is working correctly.")
    elif passed > 0:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}PARTIAL: Some upload tests passed{Colors.END}")
        print("\nSome upload functionality is working. Check failed tests above.")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}FAILED: No upload tests passed{Colors.END}")
        print("\nFile upload functionality may not be configured correctly.")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Tests interrupted by user{Colors.END}")
        sys.exit(0)
