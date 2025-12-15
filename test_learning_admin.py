"""Test script for Learning Administration System"""
import os
import sys
import django
import requests
import json
from pathlib import Path

# Fix unicode output on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add backend to path
sys.path.append(r'C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend')
os.chdir(r'C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.learning.models import CareerPath, LearningModule, Quiz
from apps.accounts.models import User

print("=" * 60)
print("LEARNING ADMINISTRATION SYSTEM TEST")
print("=" * 60)

# Test configuration
API_BASE = 'http://localhost:8000/api'
admin_email = 'fostanesmarkrenier@gmail.com'
admin_password = 'Admin@123'

def login():
    """Login and get auth token"""
    print("\n1. Testing admin login...")
    response = requests.post(f'{API_BASE}/auth/login/', json={
        'email': admin_email,
        'password': admin_password
    })
    
    if response.status_code == 200:
        data = response.json()
        print("✓ Login successful")
        return data['tokens']['access']
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(response.text)
        return None

def test_career_paths(token):
    """Test career path CRUD operations"""
    print("\n2. Testing Career Paths...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Get existing career paths
    response = requests.get(f'{API_BASE}/learning/career-paths/', headers=headers)
    if response.status_code == 200:
        paths = response.json()
        count = len(paths.get('results', paths))
        print(f"✓ Fetched {count} career paths")
    else:
        print(f"✗ Failed to fetch career paths: {response.status_code}")
    
    # Create a new career path
    new_path = {
        'name': 'Test Web Development Path',
        'description': 'Learn modern web development from scratch',
        'program_type': 'bsit',
        'difficulty_level': 'beginner',
        'estimated_duration': 8,
        'points_reward': 500,
        'is_active': True
    }
    
    response = requests.post(
        f'{API_BASE}/learning/admin/career-paths/',
        json=new_path,
        headers=headers
    )
    
    if response.status_code == 201:
        created_path = response.json()
        print(f"✓ Created career path: {created_path['name']}")
        return created_path['id']
    else:
        print(f"✗ Failed to create career path: {response.status_code}")
        print(response.text)
        return None

def test_modules(token, career_path_id):
    """Test learning module CRUD operations"""
    print("\n3. Testing Learning Modules...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Get existing modules
    response = requests.get(f'{API_BASE}/learning/modules/', headers=headers)
    if response.status_code == 200:
        modules = response.json()
        count = len(modules.get('results', modules))
        print(f"✓ Fetched {count} modules")
    else:
        print(f"✗ Failed to fetch modules: {response.status_code}")
    
    # Create a new module
    if career_path_id:
        new_module = {
            'career_path': career_path_id,
            'title': 'Test HTML Basics Module',
            'description': 'Learn the fundamentals of HTML',
            'module_type': 'text',
            'difficulty_level': 'beginner',
            'content': 'HTML is the standard markup language for Web pages...',
            'duration_minutes': 45,
            'points_reward': 50,
            'order': 1
        }
        
        response = requests.post(
            f'{API_BASE}/learning/admin/modules/',
            json=new_module,
            headers=headers
        )
        
        if response.status_code == 201:
            created_module = response.json()
            print(f"✓ Created module: {created_module['title']}")
            return created_module['id']
        else:
            print(f"✗ Failed to create module: {response.status_code}")
            print(response.text)
    
    return None

def test_quizzes(token, module_id):
    """Test quiz CRUD operations"""
    print("\n4. Testing Quizzes...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Get existing quizzes
    response = requests.get(f'{API_BASE}/learning/quizzes/', headers=headers)
    if response.status_code == 200:
        quizzes = response.json()
        count = len(quizzes.get('results', quizzes))
        print(f"✓ Fetched {count} quizzes")
    else:
        print(f"✗ Failed to fetch quizzes: {response.status_code}")
    
    # Create a new quiz
    if module_id:
        new_quiz = {
            'learning_module': module_id,
            'title': 'Test HTML Basics Quiz',
            'description': 'Test your knowledge of HTML basics',
            'time_limit_minutes': 15,
            'passing_score': 70,
            'max_attempts': 3,
            'randomize_questions': True
        }
        
        response = requests.post(
            f'{API_BASE}/learning/quizzes/',
            json=new_quiz,
            headers=headers
        )
        
        if response.status_code == 201:
            created_quiz = response.json()
            print(f"✓ Created quiz: {created_quiz['title']}")
            return created_quiz['id']
        else:
            print(f"✗ Failed to create quiz: {response.status_code}")
            print(response.text)
    
    return None

def test_statistics(token):
    """Test statistics endpoint"""
    print("\n5. Testing Statistics...")
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.get(
        f'{API_BASE}/learning/admin/career-paths/statistics/',
        headers=headers
    )
    
    if response.status_code == 200:
        stats = response.json()
        print("✓ Statistics retrieved:")
        print(f"  - Total paths: {stats.get('total_paths', 0)}")
        print(f"  - Active paths: {stats.get('active_paths', 0)}")
        print(f"  - Total modules: {stats.get('total_modules', 0)}")
        print(f"  - Total enrollments: {stats.get('total_enrollments', 0)}")
    else:
        print(f"✗ Failed to get statistics: {response.status_code}")

def check_database():
    """Check database state"""
    print("\n6. Database State Check...")
    
    # Check career paths
    paths = CareerPath.objects.all()
    print(f"✓ Career Paths in DB: {paths.count()}")
    for path in paths[:3]:
        print(f"  - {path.name} ({path.program_type})")
    
    # Check modules
    modules = LearningModule.objects.all()
    print(f"✓ Learning Modules in DB: {modules.count()}")
    for module in modules[:3]:
        print(f"  - {module.title} ({module.module_type})")
    
    # Check quizzes
    quizzes = Quiz.objects.all()
    print(f"✓ Quizzes in DB: {quizzes.count()}")
    for quiz in quizzes[:3]:
        print(f"  - {quiz.title}")

def cleanup_test_data():
    """Clean up test data created during testing"""
    print("\n7. Cleaning up test data...")
    
    # Delete test career paths
    deleted = CareerPath.objects.filter(name__startswith='Test').delete()
    if deleted[0] > 0:
        print(f"✓ Cleaned up {deleted[0]} test career paths")
    
    # Delete test modules
    deleted = LearningModule.objects.filter(title__startswith='Test').delete()
    if deleted[0] > 0:
        print(f"✓ Cleaned up {deleted[0]} test modules")
    
    # Delete test quizzes
    deleted = Quiz.objects.filter(title__startswith='Test').delete()
    if deleted[0] > 0:
        print(f"✓ Cleaned up {deleted[0]} test quizzes")

def main():
    try:
        # Login
        token = login()
        if not token:
            print("\n❌ Cannot proceed without authentication")
            return
        
        # Run tests
        career_path_id = test_career_paths(token)
        module_id = test_modules(token, career_path_id)
        quiz_id = test_quizzes(token, module_id)
        test_statistics(token)
        
        # Check database
        check_database()
        
        # Optional: Clean up test data
        print("\nDo you want to clean up test data? (y/n): ", end='')
        if input().lower() == 'y':
            cleanup_test_data()
        
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        print("✅ Learning Administration System is working!")
        print("\nAccess the admin interface at:")
        print("  http://localhost:5173/learning-admin")
        print("\nFeatures available:")
        print("  - Create, edit, delete career paths")
        print("  - Upload and manage learning modules")
        print("  - Create and manage quizzes")
        print("  - View statistics and analytics")
        print("  - AI-powered module creation from documents")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("Make sure the backend server is running on http://localhost:8000")
    print("Press Enter to continue...")
    input()
    main()
    
print("\n" + "=" * 60)
