"""
Seed the career map: the jobs each CCIS program leads to.

Roles only. Paths, modules and quizzes come later — a role's career_path stays
null until one is seeded, and the map is useful before any of them exist.

Idempotent: keyed on slug, so re-running updates copy rather than duplicating
rows, and never touches career_path. That matters — once a role is wired to a
seeded path, re-running this command must not unwire it.

    python manage.py seed_career_roles
    python manage.py seed_career_roles --prune   # deactivate roles no longer listed
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.learning.models import CareerRole

# (category, name, summary, [skills], demand)
#
# Grouped so each program reads as three or four categories rather than one long
# list — the middle level of the tree exists to keep any single column scannable.
CATALOGUE = {
    'bscs': [
        ('Software Engineering', 'Backend Engineer',
         'Builds the APIs, business logic and data access behind an application.',
         ['Python', 'Databases', 'REST APIs', 'Testing'], 'high'),
        ('Software Engineering', 'Frontend Engineer',
         'Builds the interfaces people actually use, and makes them fast and accessible.',
         ['JavaScript', 'React', 'CSS', 'Accessibility'], 'high'),
        ('Software Engineering', 'Full-Stack Engineer',
         'Works across interface and server, owning a feature end to end.',
         ['TypeScript', 'Django', 'SQL', 'Git'], 'high'),
        ('Software Engineering', 'Mobile Developer',
         'Builds Android or iOS applications, including offline behaviour.',
         ['Kotlin', 'Flutter', 'Mobile UI', 'APIs'], 'steady'),
        ('Software Engineering', 'Game Developer',
         'Builds interactive real-time systems: graphics, physics and gameplay.',
         ['C#', 'Unity', 'Linear algebra', 'Optimisation'], 'emerging'),

        ('Data and AI', 'Data Scientist',
         'Turns messy data into models and findings a decision can rest on.',
         ['Python', 'Statistics', 'pandas', 'Visualisation'], 'high'),
        ('Data and AI', 'Machine Learning Engineer',
         'Takes models out of notebooks and into production where they must stay reliable.',
         ['PyTorch', 'MLOps', 'Feature pipelines', 'Evaluation'], 'high'),
        ('Data and AI', 'Data Engineer',
         'Builds the pipelines and warehouses everyone else queries.',
         ['SQL', 'ETL', 'Airflow', 'Warehousing'], 'high'),

        ('Systems and Security', 'Cybersecurity Analyst',
         'Finds and closes weaknesses before somebody else finds them.',
         ['Networking', 'Threat analysis', 'Linux', 'Cryptography'], 'high'),
        ('Systems and Security', 'Embedded Systems Developer',
         'Writes software for hardware, where memory and timing are the constraints.',
         ['C', 'Microcontrollers', 'RTOS', 'Electronics'], 'steady'),
        ('Systems and Security', 'DevOps Engineer',
         'Owns how code reaches production and stays healthy once it is there.',
         ['Linux', 'Docker', 'CI/CD', 'Monitoring'], 'high'),

        ('Quality and Research', 'QA Automation Engineer',
         'Writes the tests that let a team change code without fear.',
         ['Test design', 'Playwright', 'CI', 'Debugging'], 'steady'),
        ('Quality and Research', 'AI Research Assistant',
         'Reads the literature, reproduces results and runs experiments.',
         ['Maths', 'Papers', 'Experiment design', 'Python'], 'emerging'),
    ],
    'bsit': [
        ('Infrastructure and Cloud', 'Cloud Engineer',
         'Designs and runs systems on AWS, Azure or GCP, and keeps the bill sane.',
         ['AWS', 'Networking', 'Terraform', 'Linux'], 'high'),
        ('Infrastructure and Cloud', 'Network Administrator',
         'Keeps the network up, segmented and understood.',
         ['TCP/IP', 'Routing', 'Firewalls', 'Troubleshooting'], 'steady'),
        ('Infrastructure and Cloud', 'System Administrator',
         'Runs the servers and services an organisation depends on daily.',
         ['Linux', 'Windows Server', 'Backups', 'Scripting'], 'steady'),
        ('Infrastructure and Cloud', 'DevOps Engineer',
         'Automates build, deploy and monitoring so releases stop being events.',
         ['CI/CD', 'Docker', 'Observability', 'Bash'], 'high'),

        ('Applications', 'Web Developer',
         'Builds and maintains the web applications an organisation runs on.',
         ['HTML/CSS', 'JavaScript', 'PHP or Python', 'MySQL'], 'high'),
        ('Applications', 'Mobile Developer',
         'Ships the mobile side of a product and keeps it working across devices.',
         ['Flutter', 'REST APIs', 'Mobile UX', 'App stores'], 'steady'),
        ('Applications', 'ERP / Low-Code Developer',
         'Configures and extends platforms like Odoo or Power Platform.',
         ['ERP modules', 'Integrations', 'SQL', 'Process mapping'], 'emerging'),

        ('Security and Data', 'IT Security Specialist',
         'Hardens systems, runs access control and responds when something happens.',
         ['Hardening', 'IAM', 'Incident response', 'Auditing'], 'high'),
        ('Security and Data', 'Database Administrator',
         'Keeps data correct, fast, backed up and recoverable.',
         ['SQL', 'Indexing', 'Backup/restore', 'Tuning'], 'steady'),
        ('Security and Data', 'IT Support Engineer',
         'The person who actually fixes it, and writes down how.',
         ['Diagnostics', 'Ticketing', 'Hardware', 'Communication'], 'steady'),

        ('Quality', 'QA Engineer',
         'Designs and runs the testing that decides whether a release ships.',
         ['Test cases', 'Automation', 'Bug reporting', 'Regression'], 'steady'),
    ],
    'bsis': [
        ('Business Analysis', 'Business Analyst',
         'Turns what a business needs into something a team can build.',
         ['Requirements', 'Process modelling', 'Stakeholders', 'Documentation'], 'high'),
        ('Business Analysis', 'Systems Analyst',
         'Sits between users and developers, and makes the two agree.',
         ['Use cases', 'UML', 'Gap analysis', 'SQL'], 'steady'),
        ('Business Analysis', 'Product Owner',
         'Owns the backlog, and decides what is worth building next.',
         ['Prioritisation', 'User stories', 'Agile', 'Metrics'], 'emerging'),

        ('Data and Reporting', 'Business Intelligence Analyst',
         'Builds the dashboards a business steers by.',
         ['Power BI', 'SQL', 'Data modelling', 'Storytelling'], 'high'),
        ('Data and Reporting', 'Data Analyst',
         'Answers questions with data, and says how confident the answer is.',
         ['Excel', 'SQL', 'Statistics', 'Visualisation'], 'high'),
        ('Data and Reporting', 'Database Administrator',
         'Keeps organisational data correct, available and recoverable.',
         ['SQL', 'Backups', 'Access control', 'Performance'], 'steady'),

        ('Process and Governance', 'IT Project Coordinator',
         'Keeps scope, schedule and people moving in the same direction.',
         ['Planning', 'Risk', 'Reporting', 'Coordination'], 'steady'),
        ('Process and Governance', 'ERP Functional Consultant',
         'Maps how a business works onto what an ERP can do.',
         ['ERP modules', 'Process design', 'Training', 'Testing'], 'emerging'),
        ('Process and Governance', 'IT Auditor',
         'Checks that controls exist, work, and can be evidenced.',
         ['Controls', 'Compliance', 'Risk assessment', 'Reporting'], 'steady'),
    ],
}


class Command(BaseCommand):
    help = 'Seed or update the career map roles for BSCS, BSIT and BSIS.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--prune', action='store_true',
            help='Deactivate roles that are no longer in the catalogue '
                 '(deactivate, never delete — a role may be referenced by a path)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        seen_slugs = []
        created = updated = 0

        for program, roles in CATALOGUE.items():
            for order, (category, name, summary, skills, demand) in enumerate(roles):
                slug = slugify(f'{program}-{name}')
                seen_slugs.append(slug)
                _, was_created = CareerRole.objects.update_or_create(
                    slug=slug,
                    defaults={
                        'program_type': program,
                        'category': category,
                        'name': name,
                        'summary': summary,
                        'core_skills': list(skills),
                        'demand': demand,
                        'order': order,
                        'is_active': True,
                        # career_path is deliberately absent: re-running this must
                        # not unwire a role from a path that has been seeded.
                    },
                )
                created += was_created
                updated += (not was_created)

        pruned = 0
        if options['prune']:
            # Deactivated, never deleted: a CareerPath may point at it, and
            # hiding a card is reversible while losing the row is not.
            pruned = CareerRole.objects.exclude(slug__in=seen_slugs).update(is_active=False)

        total = CareerRole.objects.filter(is_active=True).count()
        linked = CareerRole.objects.filter(is_active=True, career_path__isnull=False).count()

        self.stdout.write(self.style.SUCCESS(
            f'career roles: {created} created, {updated} updated'
            + (f', {pruned} deactivated' if options['prune'] else '')
        ))
        for program in CATALOGUE:
            count = CareerRole.objects.filter(program_type=program, is_active=True).count()
            categories = CareerRole.objects.filter(
                program_type=program, is_active=True,
            ).values_list('category', flat=True).distinct().count()
            self.stdout.write(f'  {program}: {count} roles across {categories} categories')
        self.stdout.write(
            f'  {linked}/{total} roles have a learning path — the rest render as '
            f'"path coming soon" until one is seeded'
        )
