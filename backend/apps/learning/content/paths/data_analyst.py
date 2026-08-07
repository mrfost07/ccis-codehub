"""
Data Analyst (BSIS).

Composed entirely from modules that already exist plus a capstone. Note that
`core.relational_data` was written for the Backend Engineer path — the same
module now serves a BSCS engineering role and a BSIS analysis role.
"""

MANIFEST = {
    'slug': 'data-analyst',
    'name': 'Data Analyst',
    'role': 'bsis-data-analyst',
    'description': (
        'Turn questions the organisation is arguing about into answers it can act '
        'on. You will learn to query a relational database, judge whether the data '
        'can support a conclusion, avoid the statistics and charts that mislead, '
        'and deliver a result people trust. No prior statistics background is '
        'assumed.'
    ),
    'program_type': 'bsis',
    'difficulty_level': 'beginner',
    'estimated_duration': 9,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Data Analysis', 'category': 'Analysis', 'level': 'intermediate'},
        {'name': 'SQL', 'category': 'Data', 'level': 'intermediate'},
        {'name': 'Databases', 'category': 'Data', 'level': 'intermediate'},
        {'name': 'Reporting', 'category': 'Analysis', 'level': 'intermediate'},
        {'name': 'Data Quality', 'category': 'Data', 'level': 'intermediate'},
    ],
    'modules': [
        'core.relational_data',
        'core.data_analysis_reporting',
        'core.requirements_analysis',
        'capstones.data_analyst',
    ],
}
