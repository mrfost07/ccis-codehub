"""
Backend Engineer (BSCS).

The first path composed from the shared library rather than declared whole. Four
of its five modules are shared — version control, HTTP, relational data and
testing are needed by most engineering roles — and only the capstone is specific
to this one. That ratio is the whole argument for the library: the next
engineering path costs a capstone, not five modules.
"""

MANIFEST = {
    'slug': 'backend-engineer',
    'name': 'Backend Engineer',
    'role': 'bscs-backend-engineer',
    'description': (
        'Build the APIs, business logic and data access behind an application. You '
        'will work with version control the way a team does, design and query a '
        'relational schema, build an HTTP interface other programs can rely on, test '
        'it so it stays correct, and run it so you know when it is not. Assumes '
        'comfort with basic programming.'
    ),
    'program_type': 'bscs',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Git', 'category': 'Tooling', 'level': 'intermediate'},
        {'name': 'REST APIs', 'category': 'Backend', 'level': 'intermediate'},
        {'name': 'Databases', 'category': 'Backend', 'level': 'intermediate'},
        {'name': 'Testing', 'category': 'Quality', 'level': 'intermediate'},
        {'name': 'Backend Development', 'category': 'Backend', 'level': 'intermediate'},
    ],
    'modules': [
        'core.version_control',
        'core.http_and_apis',
        'core.relational_data',
        'core.automated_testing',
        'capstones.backend_engineer',
    ],
}
