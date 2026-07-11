"""
Management command: cleanup_jobs
Usage: python manage.py cleanup_jobs [--days 30]
"""
from django.core.management.base import BaseCommand
from apps.learning.job_service import cleanup_stale_jobs


class Command(BaseCommand):
    help = 'Deactivate job listings cached more than N days ago.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=30,
            help='Deactivate jobs older than this many days (default: 30).',
        )

    def handle(self, *args, **options):
        count = cleanup_stale_jobs(days=options['days'])
        self.stdout.write(self.style.SUCCESS(f'Deactivated {count} stale job listings.'))
