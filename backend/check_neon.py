"""Check Neon database connection and data"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection

User = get_user_model()

print("="*50)
print("DATABASE CONNECTION CHECK")
print("="*50)
print(f"Host: {connection.settings_dict.get('HOST', 'unknown')}")
print(f"Database: {connection.settings_dict.get('NAME', 'unknown')}")
print(f"Engine: {connection.settings_dict.get('ENGINE', 'unknown')}")

print("\n" + "="*50)
print("DATA CHECK")
print("="*50)
print(f"Users in database: {User.objects.count()}")
print(f"Superusers: {User.objects.filter(is_superuser=True).count()}")

# List users
for user in User.objects.all()[:5]:
    print(f"  - {user.username} (admin: {user.is_superuser})")

# Check community posts
try:
    from apps.community.models import Post, Organization
    print(f"\nPosts: {Post.objects.count()}")
    print(f"Organizations: {Organization.objects.count()}")
except Exception as e:
    print(f"Error checking posts: {e}")
