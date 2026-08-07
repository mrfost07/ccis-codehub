"""Business Analyst (BSIS) — the first path for the BSIS programme."""

MANIFEST = {
    'slug': 'business-analyst',
    'name': 'Business Analyst',
    'role': 'bsis-business-analyst',
    'description': (
        'Work out what an organisation actually needs and see the change through. '
        'You will learn to get behind a stated request to the real problem, write '
        'requirements that cannot be misread, model the process they belong to, '
        'read the data behind a decision, and take a change to acceptance and '
        'adoption. No technical background is assumed.'
    ),
    'program_type': 'bsis',
    'difficulty_level': 'beginner',
    'estimated_duration': 10,
    'points_reward': 250,
    'color': '#8b5cf6',
    'icon': '',
    'skills_granted': [
        {'name': 'Business Analysis', 'category': 'Analysis', 'level': 'intermediate'},
        {'name': 'Requirements', 'category': 'Analysis', 'level': 'intermediate'},
        {'name': 'Process Modelling', 'category': 'Analysis', 'level': 'intermediate'},
        {'name': 'Data Analysis', 'category': 'Analysis', 'level': 'beginner'},
        {'name': 'Stakeholder Management', 'category': 'Delivery', 'level': 'intermediate'},
    ],
    'modules': [
        'core.requirements_analysis',
        'core.data_analysis_reporting',
        'core.relational_data',
        'capstones.business_analyst',
    ],
}
