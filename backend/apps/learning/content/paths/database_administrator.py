"""Database Administrator (BSIT) — capstone only."""

MANIFEST = {
    'slug': 'database-administrator',
    'name': 'Database Administrator',
    'role': 'bsit-database-administrator',
    'description': (
        'Look after the one thing an organisation cannot recreate. You will learn to '
        'design and query a relational schema, run the server underneath it, protect '
        'it, and then keep a production database fast, recoverable and changeable — '
        'including altering its shape without stopping the application.'
    ),
    'program_type': 'bsit',
    'difficulty_level': 'intermediate',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Database Administration', 'category': 'Data', 'level': 'intermediate'},
        {'name': 'Databases', 'category': 'Data', 'level': 'intermediate'},
        {'name': 'SQL', 'category': 'Data', 'level': 'intermediate'},
        {'name': 'Linux', 'category': 'Infrastructure', 'level': 'beginner'},
        {'name': 'Security', 'category': 'Security', 'level': 'beginner'},
    ],
    'modules': [
        'core.relational_data',
        'core.linux_and_systems',
        'core.security_fundamentals',
        'capstones.database_administrator',
    ],
}
