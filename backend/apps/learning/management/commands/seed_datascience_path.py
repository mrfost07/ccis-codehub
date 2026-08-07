"""
Seed the "Data Science and Machine Learning" career path.

Kept because the name is already in documentation and muscle memory. The content
moved to `apps/learning/content/paths/data_science.py` and the machinery to
`apps/learning/content/builder.py` when seeding was generalised across paths, so
this is now a name for the generic command.

    python manage.py seed_datascience_path
    python manage.py seed_datascience_path --instructor someone@ssct.edu.ph
    python manage.py seed_datascience_path --status pending

Equivalent to:

    python manage.py seed_path data-science-and-machine-learning
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand

SLUG = 'data-science-and-machine-learning'


class Command(BaseCommand):
    help = 'Seed the Data Science and Machine Learning career path.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--instructor', default='rfostanes@ssct.edu.ph',
            help='Email of the instructor who owns the path.',
        )
        parser.add_argument(
            '--status', default='approved',
            choices=['draft', 'pending', 'approved'],
            help='approval_status for the path.',
        )

    def handle(self, *args, **options):
        call_command(
            'seed_path', SLUG,
            instructor=options['instructor'], status=options['status'],
            stdout=self.stdout, stderr=self.stderr,
        )
