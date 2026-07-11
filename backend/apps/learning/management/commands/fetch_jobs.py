"""
Management command: fetch_jobs
Usage: python manage.py fetch_jobs [--queries "..."] [--pages N]
"""
from django.core.management.base import BaseCommand
from apps.learning.job_service import sync_jobs, DEFAULT_QUERIES


class Command(BaseCommand):
    help = 'Fetch jobs from JSearch (RapidAPI) and cache them in the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--queries', nargs='+', type=str,
            default=DEFAULT_QUERIES,
            help='Search queries to run against JSearch (space-separated).',
        )
        parser.add_argument(
            '--pages', type=int, default=2,
            help='Number of result pages per query (default: 2).',
        )

    def handle(self, *args, **options):
        queries = options['queries']
        self.stdout.write(self.style.NOTICE(f'Fetching jobs for {len(queries)} queries...'))
        result = sync_jobs(queries=queries)
        self.stdout.write(self.style.SUCCESS(
            f"Done — created: {result['created']}, updated: {result['updated']}, errors: {result['errors']}"
        ))
