"""
Management command to seed the BadgeDefinition catalog.
Run once after migrations: python manage.py seed_badges
"""
from django.core.management.base import BaseCommand
from apps.learning.models import BadgeDefinition

BADGES = [
    # ── CODING ────────────────────────────────────────────────────────
    {
        'name': 'First Blood',
        'description': 'Solve your very first coding challenge.',
        'icon': '⚔️',
        'category': 'coding',
        'trigger_type': 'challenges_solved',
        'trigger_threshold': 1,
        'rarity': 'common',
    },
    {
        'name': 'Code Warrior',
        'description': 'Solve 5 coding challenges.',
        'icon': '🗡️',
        'category': 'coding',
        'trigger_type': 'challenges_solved',
        'trigger_threshold': 5,
        'rarity': 'common',
    },
    {
        'name': 'Problem Crusher',
        'description': 'Solve 10 coding challenges.',
        'icon': '🎯',
        'category': 'coding',
        'trigger_type': 'challenges_solved',
        'trigger_threshold': 10,
        'rarity': 'rare',
    },
    {
        'name': 'Coding Master',
        'description': 'Solve 25 coding challenges.',
        'icon': '🏆',
        'category': 'coding',
        'trigger_type': 'challenges_solved',
        'trigger_threshold': 25,
        'rarity': 'epic',
    },
    {
        'name': 'Speed Demon',
        'description': 'Solve a challenge in under 60 seconds.',
        'icon': '⚡',
        'category': 'coding',
        'trigger_type': 'challenges_solved_fast',
        'trigger_threshold': 1,
        'rarity': 'rare',
    },
    # ── LEARNING ──────────────────────────────────────────────────────
    {
        'name': 'Eager Learner',
        'description': 'Complete your first learning module.',
        'icon': '📚',
        'category': 'learning',
        'trigger_type': 'modules_completed',
        'trigger_threshold': 1,
        'rarity': 'common',
    },
    {
        'name': 'Bookworm',
        'description': 'Complete 10 learning modules.',
        'icon': '🦉',
        'category': 'learning',
        'trigger_type': 'modules_completed',
        'trigger_threshold': 10,
        'rarity': 'common',
    },
    {
        'name': 'Knowledge Seeker',
        'description': 'Complete 25 learning modules.',
        'icon': '🔭',
        'category': 'learning',
        'trigger_type': 'modules_completed',
        'trigger_threshold': 25,
        'rarity': 'rare',
    },
    {
        'name': 'Path Finisher',
        'description': 'Complete your first career path.',
        'icon': '🛤️',
        'category': 'learning',
        'trigger_type': 'paths_completed',
        'trigger_threshold': 1,
        'rarity': 'rare',
    },
    {
        'name': 'Road Scholar',
        'description': 'Complete 3 career paths.',
        'icon': '🗺️',
        'category': 'learning',
        'trigger_type': 'paths_completed',
        'trigger_threshold': 3,
        'rarity': 'epic',
    },
    # ── MILESTONE ─────────────────────────────────────────────────────
    {
        'name': 'Certified',
        'description': 'Earn your first certificate.',
        'icon': '💎',
        'category': 'milestone',
        'trigger_type': 'certificates_earned',
        'trigger_threshold': 1,
        'rarity': 'epic',
    },
    {
        'name': 'Hall of Fame',
        'description': 'Earn 3 certificates.',
        'icon': '🌟',
        'category': 'milestone',
        'trigger_type': 'certificates_earned',
        'trigger_threshold': 3,
        'rarity': 'legendary',
    },
    # ── QUIZ ──────────────────────────────────────────────────────────
    {
        'name': 'Quiz Ace',
        'description': 'Score 100% on any quiz.',
        'icon': '🧠',
        'category': 'quiz',
        'trigger_type': 'quiz_perfect',
        'trigger_threshold': 1,
        'rarity': 'rare',
    },
]


class Command(BaseCommand):
    help = 'Seed the BadgeDefinition catalog with default badges.'

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for data in BADGES:
            obj, was_created = BadgeDefinition.objects.update_or_create(
                name=data['name'],
                defaults=data,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Badge seeding done: {created} created, {updated} updated. '
                f'Total: {BadgeDefinition.objects.count()} badges.'
            )
        )
