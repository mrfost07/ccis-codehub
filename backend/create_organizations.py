"""
Script to create initial organizations for testing
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.community.models import Organization, OrganizationMembership
from django.contrib.auth import get_user_model

User = get_user_model()

def create_organizations():
    # Get or create admin user
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        print("No admin user found. Please create one first.")
        return
    
    organizations = [
        {
            'name': 'BSCS Students',
            'slug': 'bscs',
            'description': 'Official group for BS Computer Science students. Share resources, discuss courses, and connect with fellow CS students.',
            'icon': '💻',
            'org_type': 'program',
            'program': 'BSCS',
            'is_official': True,
            'is_private': False,
            'requires_approval': False,
        },
        {
            'name': 'BSIT Students',
            'slug': 'bsit',
            'description': 'Official group for BS Information Technology students. Collaborate on projects and share IT knowledge.',
            'icon': '🖥️',
            'org_type': 'program',
            'program': 'BSIT',
            'is_official': True,
            'is_private': False,
            'requires_approval': False,
        },
        {
            'name': 'BSIS Students',
            'slug': 'bsis',
            'description': 'Official group for BS Information Systems students. Learn about business systems and enterprise solutions.',
            'icon': '📊',
            'org_type': 'program',
            'program': 'BSIS',
            'is_official': True,
            'is_private': False,
            'requires_approval': False,
        },
        {
            'name': 'CCIS Community',
            'slug': 'ccis-community',
            'description': 'The main hub for all CCIS students. Stay updated with announcements, events, and news.',
            'icon': '🎓',
            'org_type': 'official',
            'program': 'ALL',
            'is_official': True,
            'is_private': False,
            'requires_approval': False,
        },
        {
            'name': 'Web Development Club',
            'slug': 'webdev-club',
            'description': 'For students passionate about web development. From HTML/CSS to React and beyond!',
            'icon': '🌐',
            'org_type': 'club',
            'program': None,
            'is_official': False,
            'is_private': False,
            'requires_approval': True,
        },
        {
            'name': 'AI & Machine Learning',
            'slug': 'ai-ml',
            'description': 'Explore artificial intelligence and machine learning. Projects, papers, and discussions.',
            'icon': '🤖',
            'org_type': 'interest',
            'program': None,
            'is_official': False,
            'is_private': False,
            'requires_approval': True,
        },
        {
            'name': 'Competitive Programming',
            'slug': 'competitive-programming',
            'description': 'Practice coding challenges, participate in contests, and sharpen your problem-solving skills.',
            'icon': '⚡',
            'org_type': 'club',
            'program': None,
            'is_official': False,
            'is_private': False,
            'requires_approval': True,
        },
        {
            'name': 'Game Development',
            'slug': 'gamedev',
            'description': 'Create games using Unity, Unreal, Godot, and more. Share your projects and learn together.',
            'icon': '🎮',
            'org_type': 'interest',
            'program': None,
            'is_official': False,
            'is_private': False,
            'requires_approval': True,
        },
    ]
    
    for org_data in organizations:
        org, created = Organization.objects.get_or_create(
            slug=org_data['slug'],
            defaults={**org_data, 'created_by': admin}
        )
        
        if created:
            # Add admin as owner
            OrganizationMembership.objects.create(
                organization=org,
                user=admin,
                role='owner',
                status='active'
            )
            org.member_count = 1
            org.save()
            print(f"Created: {org.name}")
        else:
            print(f"Already exists: {org.name}")
    
    print("\nOrganizations created successfully!")
    print(f"Total: {Organization.objects.count()} organizations")

if __name__ == '__main__':
    create_organizations()
