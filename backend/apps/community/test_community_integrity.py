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


@pytest.mark.django_db
class TestFeedQueryPerformance:
    """The feed's is_liked must be a single subquery, not one query per post."""

    def test_feed_query_count_is_bounded(self, django_assert_max_num_queries):
        viewer = _user('viewer')
        author = _user('author')
        from apps.community.models import PostLike
        posts = [Post.objects.create(author=author, content=f'post {i}') for i in range(12)]
        for p in posts[:6]:
            PostLike.objects.create(post=p, user=viewer)

        client = APIClient()
        client.force_authenticate(viewer)
        # With the N+1, 12 posts would add ~12 is_liked queries. The annotation
        # keeps it bounded regardless of post count.
        with django_assert_max_num_queries(12):
            resp = client.get('/api/community/posts/')
        assert resp.status_code == 200
        results = resp.data.get('results', resp.data)
        liked = {r['id']: r['is_liked'] for r in results}
        assert sum(1 for v in liked.values() if v) == 6


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


@pytest.mark.django_db
class TestWhoReacted:
    """
    A like count that cannot be opened is just a number.

    PostLike.user and CommentLike.user have always been recorded; the API
    returned only like_count and is_liked and dropped the identities, so no UI
    could show who reacted. These pin the shape the reactor list is rendered
    from, and that it stays bounded in queries — a per-liker query here is
    trivially easy to reintroduce by dropping one select_related.
    """

    def _post_with_likers(self, count, name='wr'):
        from apps.community.models import PostLike
        author = _user(f'{name}_author')
        post = Post.objects.create(author=author, content='who liked this')
        likers = [_user(f'{name}_liker{i}') for i in range(count)]
        for user in likers:
            PostLike.objects.create(post=post, user=user)
        return post, author, likers

    def _as(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_post_likers_returns_who_not_just_how_many(self):
        post, author, likers = self._post_with_likers(3, 'a')
        resp = self._as(author).get(f'/api/community/posts/{post.id}/likers/')

        assert resp.status_code == 200, resp.data
        rows = resp.data.get('results', resp.data)
        assert {r['username'] for r in rows} == {u.username for u in likers}

    def test_each_reactor_carries_enough_to_render(self):
        post, author, _ = self._post_with_likers(1, 'b')
        rows = self._as(author).get(
            f'/api/community/posts/{post.id}/likers/'
        ).data.get('results', [])

        assert rows, 'no reactor rows returned'
        # `id` is what makes a row navigable to a profile, `profile_picture` what
        # lets it be an avatar instead of a bare name. Both are the difference
        # between this feature existing and not.
        for field in ('id', 'username', 'first_name', 'last_name', 'profile_picture'):
            assert field in rows[0], f'reactor rows cannot be rendered without {field}'

    def test_likers_is_paginated(self):
        # like_count is unbounded and this route is hit from a tap, so it must
        # never serialise every liker at once.
        post, author, _ = self._post_with_likers(25, 'c')
        resp = self._as(author).get(f'/api/community/posts/{post.id}/likers/')

        assert resp.data['count'] == 25
        assert len(resp.data['results']) == 20  # DRF PAGE_SIZE
        assert resp.data['next'], 'no next page link, so the rest are unreachable'

    def test_likers_query_count_does_not_grow_with_the_number_of_likers(
        self, django_assert_max_num_queries,
    ):
        post, author, _ = self._post_with_likers(20, 'd')
        client = self._as(author)
        # Without select_related('user') this is one query per liker on the page.
        with django_assert_max_num_queries(8):
            resp = client.get(f'/api/community/posts/{post.id}/likers/')
        assert resp.status_code == 200

    def test_comment_likers_covers_replies_as_well(self):
        from apps.community.models import Comment, CommentLike
        author = _user('e_author')
        fan = _user('e_fan')
        post = Post.objects.create(author=author, content='p')
        comment = Comment.objects.create(post=post, author=author, content='c')
        # Replies are Comments with a parent — there is no separate reply model,
        # so one endpoint has to serve both.
        reply = Comment.objects.create(
            post=post, author=author, parent=comment, content='r',
        )
        CommentLike.objects.create(comment=reply, user=fan)

        resp = self._as(author).get(f'/api/community/comments/{reply.id}/likers/')

        assert resp.status_code == 200, resp.data
        rows = resp.data.get('results', resp.data)
        assert [r['username'] for r in rows] == [fan.username]

    def test_likers_requires_authentication(self):
        post, _, _ = self._post_with_likers(1, 'f')
        resp = APIClient().get(f'/api/community/posts/{post.id}/likers/')
        assert resp.status_code in (401, 403), resp.status_code


@pytest.mark.django_db
class TestChatReactionsIdentifyPeople:
    """
    Chat already grouped reactions by emoji, but `users` was a list of bare
    usernames — no id to link with and no avatar to draw, so the UI could only
    ever render the count.
    """

    def test_reaction_users_are_objects_not_bare_usernames(self):
        from apps.community.models import ChatMessage, ChatRoom, MessageReaction
        # 'general' is not one of ROOM_TYPE_CHOICES, so readable_by excludes it and
        # nobody can reach this room. It only listed because the message viewset
        # used to skip the readability check.
        room = ChatRoom.objects.create(name='General', room_type='GLOBAL')
        sender = _user('cr_sender')
        reactor = _user('cr_reactor')
        message = ChatMessage.objects.create(room=room, sender=sender, content='hi')
        MessageReaction.objects.create(message=message, user=reactor, reaction='👍')

        client = APIClient()
        client.force_authenticate(reactor)
        resp = client.get(f'/api/community/chat/messages/?room={room.id}')
        assert resp.status_code == 200, resp.data

        rows = resp.data.get('results', resp.data)
        summary = rows[0]['reactions_summary']
        entry = summary['👍']

        assert entry['count'] == 1
        assert entry['reacted_by_me'] is True
        assert isinstance(entry['users'][0], dict), (
            'reaction users are still bare usernames, so no avatar can be drawn'
        )
        assert entry['users'][0]['username'] == reactor.username
        assert 'id' in entry['users'][0]
        assert 'profile_picture' in entry['users'][0]
