"""
Full-Stack Engineer (BSCS).

Every module except the capstone already existed. One new file, one whole path —
which is the argument for the shared library, stated as a fact rather than a
plan.
"""

MANIFEST = {
    'slug': 'full-stack-engineer',
    'name': 'Full-Stack Engineer',
    'role': 'bscs-full-stack-engineer',
    'description': (
        'Own a feature end to end, across the interface and the server. You will '
        'design the contract between the two sides and keep it, build and query a '
        'relational schema, build an interface that handles the network honestly, '
        'and ship a change without breaking the clients already using it. Assumes '
        'comfort with basic programming and the web.'
    ),
    'program_type': 'bscs',
    'difficulty_level': 'intermediate',
    'estimated_duration': 12,
    'points_reward': 300,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Full-Stack Development', 'category': 'Engineering', 'level': 'intermediate'},
        {'name': 'REST APIs', 'category': 'Backend', 'level': 'intermediate'},
        {'name': 'Databases', 'category': 'Backend', 'level': 'intermediate'},
        {'name': 'JavaScript', 'category': 'Frontend', 'level': 'intermediate'},
        {'name': 'Git', 'category': 'Tooling', 'level': 'intermediate'},
    ],
    'modules': [
        'core.version_control',
        'core.http_and_apis',
        'core.relational_data',
        'core.frontend_foundations',
        'capstones.full_stack_engineer',
    ],
}
