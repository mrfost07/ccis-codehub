"""Frontend Engineer (BSCS) — one new core module plus a capstone."""

MANIFEST = {
    'slug': 'frontend-engineer',
    'name': 'Frontend Engineer',
    'role': 'bscs-frontend-engineer',
    'description': (
        'Build the interfaces people actually use, and make them fast and '
        'accessible. You will work with version control the way a team does, '
        'consume an HTTP API without lying to the user about what it is doing, '
        'lay out and structure an interface that survives growth, test it the way '
        'a user experiences it, and ship it. Assumes comfort with basic HTML, CSS '
        'and JavaScript.'
    ),
    'program_type': 'bscs',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'JavaScript', 'category': 'Frontend', 'level': 'intermediate'},
        {'name': 'CSS', 'category': 'Frontend', 'level': 'intermediate'},
        {'name': 'Accessibility', 'category': 'Frontend', 'level': 'intermediate'},
        {'name': 'Git', 'category': 'Tooling', 'level': 'intermediate'},
        {'name': 'Testing', 'category': 'Quality', 'level': 'intermediate'},
    ],
    'modules': [
        'core.version_control',
        'core.http_and_apis',
        'core.frontend_foundations',
        'core.automated_testing',
        'capstones.frontend_engineer',
    ],
}
