"""
Backfill command tests (Req 26, 27, 36): recomputes stored counters from
source records and is idempotent.
"""
import pytest
from django.core.management import call_command

from apps.accounts.models import User
from apps.community.models import Post, UserFollow, PostLike


def _user(name):
    return User.objects.create_user(
        email=f'{name}@ssct.edu.ph', username=name, password='pw12345678', role='student'
    )


@pytest.mark.django_db
class TestBackfillCounts:
    def test_corrects_follow_and_like_drift(self):
        alice, bob = _user('alice'), _user('bob')
        # Real relationship exists, but the stored counters are wrong (drift).
        UserFollow.objects.create(follower=bob, following=alice, status='accepted')
        alice.followers_count = 99
        bob.following_count = 99
        alice.save(); bob.save()

        post = Post.objects.create(author=alice, content='hi', like_count=42)
        PostLike.objects.create(post=post, user=bob)

        call_command('backfill_counts')

        alice.refresh_from_db(); bob.refresh_from_db(); post.refresh_from_db()
        assert alice.followers_count == 1
        assert bob.following_count == 1
        assert post.like_count == 1

    def test_is_idempotent(self):
        alice, bob = _user('alice'), _user('bob')
        UserFollow.objects.create(follower=bob, following=alice, status='accepted')

        call_command('backfill_counts')
        alice.refresh_from_db()
        first = alice.followers_count
        call_command('backfill_counts')
        alice.refresh_from_db()
        assert alice.followers_count == first == 1
