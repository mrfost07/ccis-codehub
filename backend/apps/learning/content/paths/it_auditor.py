"""IT Auditor (BSIS) — capstone only."""

MANIFEST = {
    'slug': 'it-auditor',
    'name': 'IT Auditor',
    'role': 'bsis-it-auditor',
    'description': (
        'Find out whether the controls an organisation believes it has actually work. '
        'You will learn what those controls are protecting, how to model the process '
        'around them, how to read the data behind them, and then how to test a '
        'control, gather evidence that stands up, and write findings people act on.'
    ),
    'program_type': 'bsis',
    'difficulty_level': 'intermediate',
    'estimated_duration': 9,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'IT Audit', 'category': 'Governance', 'level': 'intermediate'},
        {'name': 'Controls', 'category': 'Governance', 'level': 'intermediate'},
        {'name': 'Security', 'category': 'Security', 'level': 'beginner'},
        {'name': 'Data Analysis', 'category': 'Analysis', 'level': 'beginner'},
        {'name': 'Requirements', 'category': 'Analysis', 'level': 'beginner'},
    ],
    'modules': [
        'core.security_fundamentals',
        'core.requirements_analysis',
        'core.data_analysis_reporting',
        'capstones.it_auditor',
    ],
}
