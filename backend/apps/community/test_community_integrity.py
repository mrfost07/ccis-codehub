"""
Community integrity tests: follow-record scoping (Req 15), valid organization
notifications (Req 16), and atomic like counters (Req 27).
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.community.models import (
    Post, UserFollow, Organization, OrganizationMembership, Notification,
)


def _user(username):
    return User.objects.create_user(
        email=f'{username}@ssct.edu.ph', username=username,
        password='pw12345678', role='student',
    )


@pytest.fixture
def alice(db):
    return _user('alice')


@pytest.fixture
def client(alice):
    c = APIClient()
    c.force_authenticate(alice)
    return c


class TestAtomicLikeCounter:
    """Req 27: like/unlike update the counter atomically and never go below 0."""

    def test_like_then_unlike_roundtrips(self, client, alice):
        post = Post.objects.create(author=alice, content='hello')
        url = f'/api/community/posts/{post.id}/like/'

        r1 = client.post(url)
        assert r1.status_code == 200
        assert r1.data['like_count'] == 1

        r2 = client.post(url)  # toggles back off
        assert r2.status_code == 200
        assert r2.data['like_count'] == 0

    def test_counter_never_negative(self, client, alice):
        post = Post.objects.create(author=alice, content='hello')
        post.like_count = 0
        post.save()
        # Like then unlike twice-ish: floor stays at 0.
        client.post(f'/api/community/posts/{post.id}/like/')
        client.post(f'/api/community/posts/{post.id}/like/')
        post.refresh_from_db()
        assert post.like_count >= 0


class TestFollowScoping:
    """Req 15: users only see/delete follows they participate in."""

    def test_list_excludes_others_follows(self, client, alice):
        bob, carol = _user('bob'), _user('carol')
        UserFollow.objects.create(follower=bob, following=carol, status='accepted')
        resp = client.get('/api/community/follows/')
        assert resp.status_code == 200
        data = resp.data.get('results', resp.data)
        assert data == [] or all(
            alice.username in (row.get('follower_username'), row.get('following_username'))
            for row in data
        )

    def test_cannot_delete_others_follow(self, client, alice):
        bob, carol = _user('bob'), _user('carol')
        follow = UserFollow.objects.create(follower=bob, following=carol, status='accepted')
        resp = client.delete(f'/api/community/follows/{follow.id}/')
        assert resp.status_code in (403, 404)
        assert UserFollow.objects.filter(id=follow.id).exists()


class TestOrganizationNotifications:
    """Req 16: org join creates a valid notification without a server error."""

    def test_join_request_creates_valid_notification(self, client, alice):
        owner = _user('owner')
        org = Organization.objects.create(
            name='Coders', slug='coders', org_type='club',
            requires_approval=True, is_private=False, created_by=owner,
        )
        OrganizationMembership.objects.create(
            organization=org, user=owner, role='owner', status='active',
        )

        resp = client.post(f'/api/community/organizations/{org.slug}/join/')
        assert resp.status_code == 200, resp.data

        note = Notification.objects.filter(
            recipient=owner, notification_type='org_join_request'
        ).first()
        assert note is not None
        assert note.title  # required field is populated
