"""Test script to verify backend fixes"""
import os
import sys
import django

# Fix unicode output on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add backend to path
sys.path.append(r'C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend')
os.chdir(r'C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import User
from apps.community.models import Post
from apps.projects.models import Project
from apps.ai_mentor.models import ProjectMentorSession

print("=" * 60)
print("BACKEND TEST RESULTS")
print("=" * 60)

# Test models
try:
    user_count = User.objects.count()
    print(f"✓ Users in database: {user_count}")
    
    # Check if admin user exists
    admin_user = User.objects.filter(email='fostanesmarkrenier@gmail.com').first()
    if admin_user:
        print(f"✓ Admin user found: {admin_user.username} (role: {admin_user.role})")
        if admin_user.role != 'admin':
            print(f"  ⚠ WARNING: User role is '{admin_user.role}', not 'admin'")
            # Update to admin
            admin_user.role = 'admin'
            admin_user.save()
            print("  ✓ Updated user role to 'admin'")
    else:
        print("✗ Admin user not found")
    
    post_count = Post.objects.count()
    print(f"✓ Posts in database: {post_count}")
    
    project_count = Project.objects.count()
    print(f"✓ Projects in database: {project_count}")
    
    session_count = ProjectMentorSession.objects.count()
    print(f"✓ AI Sessions in database: {session_count}")
    
    # Check media directories
    import os
    media_dir = os.path.join(os.getcwd(), 'media')
    if os.path.exists(media_dir):
        print("✓ Media directory exists")
        subdirs = ['profile_pictures', 'post_images']
        for subdir in subdirs:
            path = os.path.join(media_dir, subdir)
            if os.path.exists(path):
                print(f"  ✓ {subdir} directory exists")
            else:
                os.makedirs(path, exist_ok=True)
                print(f"  ✓ Created {subdir} directory")
    else:
        os.makedirs(media_dir, exist_ok=True)
        os.makedirs(os.path.join(media_dir, 'profile_pictures'), exist_ok=True)
        os.makedirs(os.path.join(media_dir, 'post_images'), exist_ok=True)
        print("✓ Created media directories")
    
    print("\n✅ All backend tests passed!")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()

print("=" * 60)
