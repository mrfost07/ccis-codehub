"""QA Automation Engineer (BSCS) — capstone only; every other module existed."""

MANIFEST = {
    'slug': 'qa-automation-engineer',
    'name': 'QA Automation Engineer',
    'role': 'bscs-qa-automation-engineer',
    'description': (
        'Build the checks that stop defects coming back. You will work with version '
        'control the way a team does, learn what makes a test real rather than '
        'decorative, understand the HTTP and interface layers you will be testing, '
        'and build a suite that stays fast and believable as the product grows.'
    ),
    'program_type': 'bscs',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Test Automation', 'category': 'Quality', 'level': 'intermediate'},
        {'name': 'Testing', 'category': 'Quality', 'level': 'intermediate'},
        {'name': 'Git', 'category': 'Tooling', 'level': 'intermediate'},
        {'name': 'HTTP', 'category': 'Backend', 'level': 'intermediate'},
        {'name': 'Frontend', 'category': 'Frontend', 'level': 'beginner'},
    ],
    'modules': [
        'core.version_control',
        'core.automated_testing',
        'core.http_and_apis',
        'core.frontend_foundations',
        'capstones.qa_automation_engineer',
    ],
}
