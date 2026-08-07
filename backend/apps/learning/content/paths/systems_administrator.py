"""Systems Administrator (BSIT) — capstone only."""

MANIFEST = {
    'slug': 'systems-administrator',
    'name': 'Systems Administrator',
    'role': 'bsit-systems-administrator',
    'description': (
        'Keep the servers an organisation depends on running. You will learn the '
        'machine itself — filesystem, processes, permissions, services and logs — '
        'the network it sits on, how to protect it, and how to build servers that '
        'can be rebuilt, watched, patched and changed without taking anything down.'
    ),
    'program_type': 'bsit',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'System Administration', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Linux', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Networking', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Security', 'category': 'Security', 'level': 'beginner'},
        {'name': 'Operations', 'category': 'Operations', 'level': 'intermediate'},
    ],
    'modules': [
        'core.linux_and_systems',
        'core.networking',
        'core.security_fundamentals',
        'capstones.systems_administrator',
    ],
}
