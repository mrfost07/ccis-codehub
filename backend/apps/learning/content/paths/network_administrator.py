"""Network Administrator (BSIT) — the first path for the BSIT programme."""

MANIFEST = {
    'slug': 'network-administrator',
    'name': 'Network Administrator',
    'role': 'bsit-network-administrator',
    'description': (
        'Keep an organisation connected. You will learn how machines find each '
        'other and move data, how to run the servers that hold the network '
        'together, how to protect it, and how to plan, segment, monitor and '
        'document a network so it still makes sense years after it was built. No '
        'prior networking background is assumed.'
    ),
    'program_type': 'bsit',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Networking', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'TCP/IP', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Linux', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Security', 'category': 'Security', 'level': 'beginner'},
        {'name': 'Troubleshooting', 'category': 'Operations', 'level': 'intermediate'},
    ],
    'modules': [
        'core.networking',
        'core.linux_and_systems',
        'core.security_fundamentals',
        'capstones.network_administrator',
    ],
}
