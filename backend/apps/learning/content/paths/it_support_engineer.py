"""
IT Support Engineer (BSIT).

Composed entirely from modules that already exist plus a capstone — the second
BSIT path costs one file, the same way the second BSCS engineering path did.
"""

MANIFEST = {
    'slug': 'it-support-engineer',
    'name': 'IT Support Engineer',
    'role': 'bsit-it-support-engineer',
    'description': (
        'Be the person who gets everyone else working again. You will learn the '
        'networking and systems ground the job stands on, how to protect accounts '
        'and data, and how to turn a vague complaint into a diagnosis, fix causes '
        'rather than symptoms, and leave a record the next person can use. Starts '
        'from the beginning.'
    ),
    'program_type': 'bsit',
    'difficulty_level': 'beginner',
    'estimated_duration': 8,
    'points_reward': 200,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'IT Support', 'category': 'Operations', 'level': 'intermediate'},
        {'name': 'Troubleshooting', 'category': 'Operations', 'level': 'intermediate'},
        {'name': 'Networking', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Linux', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Security', 'category': 'Security', 'level': 'beginner'},
    ],
    'modules': [
        'core.networking',
        'core.linux_and_systems',
        'core.security_fundamentals',
        'capstones.it_support_engineer',
    ],
}
