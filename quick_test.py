"""Quick test to verify uploads are working"""
import os
import sys

# Fix unicode output on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add backend to path
sys.path.append(r'C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend')
os.chdir(r'C:\Users\fosta\OneDrive\Desktop\Software Engineering\Project\CCIS-CodeHub\backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

print("=" * 60)
print("SYSTEM HEALTH CHECK")
print("=" * 60)

from apps.accounts.models import User
from apps.community.models import Post
from pathlib import Path

# Check admin user
admin = User.objects.filter(email='fostanesmarkrenier@gmail.com').first()
if admin:
    print(f"✓ Admin user exists: {admin.username} (role: {admin.role})")
    if admin.profile_picture:
        print(f"  ✓ Has profile picture: {admin.profile_picture}")
else:
    print("✗ Admin user not found")

# Check posts
total_posts = Post.objects.count()
posts_with_images = Post.objects.exclude(image='').exclude(image__isnull=True).count()
print(f"\n✓ Total posts: {total_posts}")
print(f"✓ Posts with images: {posts_with_images}")

# Check media directories
media_dir = Path('media')
if media_dir.exists():
    print("\n✓ Media directory exists")
    
    profile_dir = media_dir / 'profile_pictures'
    post_dir = media_dir / 'post_images'
    
    if profile_dir.exists():
        profile_files = list(profile_dir.glob('*'))
        print(f"  ✓ profile_pictures/ exists ({len(profile_files)} files)")
    else:
        print("  ✗ profile_pictures/ missing")
        
    if post_dir.exists():
        post_files = list(post_dir.glob('*'))
        print(f"  ✓ post_images/ exists ({len(post_files)} files)")
    else:
        print("  ✗ post_images/ missing")
else:
    print("\n✗ Media directory missing")

# Check parser classes
from apps.accounts.views import UserProfileView
from apps.community.views import PostViewSet

print("\n✓ Parser Classes:")
if hasattr(UserProfileView, 'parser_classes'):
    print("  ✓ UserProfileView has parser_classes")
else:
    print("  ✗ UserProfileView missing parser_classes")

if hasattr(PostViewSet, 'parser_classes'):
    print("  ✓ PostViewSet has parser_classes")
else:
    print("  ✗ PostViewSet missing parser_classes")

# Check CORS settings
from django.conf import settings

print("\n✓ CORS Configuration:")
if 'http://localhost:5173' in settings.CORS_ALLOWED_ORIGINS:
    print("  ✓ Frontend URL (localhost:5173) is allowed")
else:
    print("  ✗ Frontend URL not in CORS_ALLOWED_ORIGINS")

print("\n" + "=" * 60)
print("RECOMMENDATIONS:")
print("=" * 60)

print("\n1. Start backend server:")
print("   cd backend")
print("   python manage.py runserver")

print("\n2. Start frontend:")
print("   cd frontend")
print("   npm run dev")

print("\n3. Test uploads:")
print("   - Login as admin")
print("   - Try uploading profile picture")
print("   - Try creating post with image")

print("\n✅ System check complete!")
print("=" * 60)
