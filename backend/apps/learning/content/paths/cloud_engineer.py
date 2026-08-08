"""
Cloud Engineer (BSIT) — the first path built on core.cloud_and_virtualisation.

Four modules, three of them already written for other paths. That ratio is the
whole point of the shared library: this role cost one capstone.
"""

MANIFEST = {
    'slug': 'cloud-engineer',
    'name': 'Cloud Engineer',
    'role': 'bsit-cloud-engineer',
    'description': (
        'Design and run systems on rented infrastructure. You will learn how '
        'machines find each other, how to operate the Linux servers underneath, '
        'what a cloud provider actually gives you and where their '
        'responsibility ends, and how to design a deployment that survives '
        'failure, recovers to a known state and costs what you intended. No '
        'prior cloud experience is assumed.'
    ),
    'program_type': 'bsit',
    'difficulty_level': 'intermediate',
    'estimated_duration': 12,
    'points_reward': 280,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Cloud Computing', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Virtualisation', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Infrastructure as Code', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Linux', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Networking', 'category': 'Infrastructure', 'level': 'intermediate'},
        {'name': 'Reliability', 'category': 'Operations', 'level': 'beginner'},
    ],
    'modules': [
        'core.networking',
        'core.linux_and_systems',
        'core.cloud_and_virtualisation',
        'capstones.cloud_engineer',
    ],
}
