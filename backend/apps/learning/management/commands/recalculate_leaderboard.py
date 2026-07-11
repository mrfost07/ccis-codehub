"""
Management command to rebuild all leaderboard snapshots from scratch.
Run: python manage.py recalculate_leaderboard
"""
from django.core.management.base import BaseCommand
from apps.learning.leaderboard_service import recalculate_all


class Command(BaseCommand):
    help = 'Rebuild LeaderboardSnapshot for every user from scratch.'

    def handle(self, *args, **options):
        self.stdout.write('Recalculating leaderboard for all users...')
        count = recalculate_all()
        self.stdout.write(
            self.style.SUCCESS(f'Done. Updated {count} leaderboard entries.')
        )
