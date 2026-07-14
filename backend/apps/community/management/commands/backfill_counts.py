"""
Recalculate stored aggregate counters from source-of-truth records.

Fixes historical drift in follower/following counts and post/comment like
counts after the counter-correctness fixes (remediation Req 26, 27, 36).
Idempotent: running it repeatedly on unchanged data produces the same result.

Usage:
    python manage.py backfill_counts
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from apps.community.models import Post, Comment

User = get_user_model()


class Command(BaseCommand):
    help = 'Recalculate follower/following and like counts from source records.'

    def handle(self, *args, **options):
        self.stdout.write('Backfilling follower/following counts...')
        followed = self._backfill_follow_counts()
        self.stdout.write(self.style.SUCCESS(f'  updated {followed} users'))

        self.stdout.write('Backfilling post like counts...')
        posts = self._backfill_like_counts(Post)
        self.stdout.write(self.style.SUCCESS(f'  updated {posts} posts'))

        self.stdout.write('Backfilling comment like counts...')
        comments = self._backfill_like_counts(Comment)
        self.stdout.write(self.style.SUCCESS(f'  updated {comments} comments'))

    def _backfill_follow_counts(self) -> int:
        users = User.objects.annotate(
            real_followers=Count('followers', filter=Q(followers__status='accepted')),
            real_following=Count('following', filter=Q(following__status='accepted')),
        )
        to_update = []
        for user in users.iterator():
            if (user.followers_count != user.real_followers
                    or user.following_count != user.real_following):
                user.followers_count = user.real_followers
                user.following_count = user.real_following
                to_update.append(user)
        if to_update:
            User.objects.bulk_update(to_update, ['followers_count', 'following_count'], batch_size=500)
        return len(to_update)

    def _backfill_like_counts(self, model) -> int:
        rows = model.objects.annotate(real_likes=Count('likes'))
        to_update = []
        for row in rows.iterator():
            if row.like_count != row.real_likes:
                row.like_count = row.real_likes
                to_update.append(row)
        if to_update:
            model.objects.bulk_update(to_update, ['like_count'], batch_size=500)
        return len(to_update)
