"""SOC Analyst (BSIT) — capstone only."""

MANIFEST = {
    'slug': 'soc-analyst',
    'name': 'SOC Analyst',
    'role': 'bsit-soc-analyst',
    'description': (
        'Notice an attack in progress and act before it spreads. You will learn how '
        'threats and access controls work, the network and systems you will be '
        'watching, and how to read ordinary activity closely enough to see what does '
        'not belong — then triage it, contain it, and handle the incident without '
        'destroying the evidence.'
    ),
    'program_type': 'bsit',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Security Operations', 'category': 'Security', 'level': 'intermediate'},
        {'name': 'Incident Response', 'category': 'Security', 'level': 'intermediate'},
        {'name': 'Log Analysis', 'category': 'Security', 'level': 'intermediate'},
        {'name': 'Networking', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Linux', 'category': 'Infrastructure', 'level': 'beginner'},
    ],
    'modules': [
        'core.security_fundamentals',
        'core.networking',
        'core.linux_and_systems',
        'capstones.soc_analyst',
    ],
}
