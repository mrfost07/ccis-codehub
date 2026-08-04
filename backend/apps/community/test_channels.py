"""
Channel scoping, threads and read state.

Before this, ChatRoom.room_type carried unique=True, so exactly four rooms could
exist on the whole platform — a channel per project was not unbuilt, it was
impossible. These tests pin the replacement: scope decides what a room belongs
to, a conditional constraint keeps the original per-program guarantee, and a
check constraint stops a room from claiming a scope it has no target for.

Threads are separate from the pre-existing reply_to. reply_to is a quoted reply,
a pointer at one earlier message with no root; asking "give me this thread" meant
walking a chain, and "how many replies" was unanswerable. thread_root plus
denormalised counters answer both in one query.
"""
from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.community.models import (
    ChannelMembership, ChatMessage, ChatRoom, Organization,
)
from apps.projects.models import Project, ProjectTask


def _user(username):
    return User.objects.create_user(
        email=f'{username}@ssct.edu.ph', username=username,
        password='pw12345678', role='student',
    )


def _project(owner, name='Proj', slug='proj'):
    return Project.objects.create(
        name=name, slug=slug, description='d', owner=owner,
        project_type='web_app', programming_language='python',
    )


@pytest.mark.django_db
class TestChannelScoping:
    def test_the_four_program_rooms_still_cannot_be_duplicated(self):
        # What unique=True was actually protecting, now scoped to where
        # room_type means something.
        ChatRoom.objects.create(name='CS', room_type='CS')
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChatRoom.objects.create(name='CS again', room_type='CS')

    def test_two_projects_can_each_have_a_channel(self):
        # The case the old schema made impossible.
        owner = _user('scope_owner')
        first = ChatRoom.for_project(_project(owner, 'One', 'one'))
        second = ChatRoom.for_project(_project(owner, 'Two', 'two'))

        assert first.pk != second.pk
        assert {first.scope, second.scope} == {ChatRoom.SCOPE_PROJECT}

    def test_for_project_is_idempotent(self):
        owner = _user('idem_owner')
        project = _project(owner, 'Idem', 'idem')

        assert ChatRoom.for_project(project).pk == ChatRoom.for_project(project).pk
        assert ChatRoom.objects.filter(project=project).count() == 1

    def test_a_project_cannot_have_two_channels(self):
        owner = _user('dupe_owner')
        project = _project(owner, 'Dupe', 'dupe')
        ChatRoom.for_project(project)

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChatRoom.objects.create(
                    name='second', scope=ChatRoom.SCOPE_PROJECT, project=project,
                )

    def test_task_channels_are_created_on_demand(self):
        owner = _user('task_owner')
        project = _project(owner, 'T', 't')
        task = ProjectTask.objects.create(project=project, title='Do the thing')

        # Lazily, so thousands of untouched tasks do not each get an empty channel.
        assert not ChatRoom.objects.filter(task=task).exists()
        room = ChatRoom.for_task(task)
        assert room.scope == ChatRoom.SCOPE_TASK
        assert ChatRoom.for_task(task).pk == room.pk

    def test_organization_channels_are_one_per_organization(self):
        owner = _user('org_owner')
        org = Organization.objects.create(
            name='CCIS', slug='ccis', description='d', created_by=owner,
        )
        ChatRoom.objects.create(
            name='CCIS', scope=ChatRoom.SCOPE_ORGANIZATION, organization=org,
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChatRoom.objects.create(
                    name='CCIS 2', scope=ChatRoom.SCOPE_ORGANIZATION, organization=org,
                )

    def test_a_scope_without_its_target_is_rejected(self):
        # A project-scoped room with no project is not a state the rest of the
        # code should have to defend against.
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChatRoom.objects.create(name='orphan', scope=ChatRoom.SCOPE_PROJECT)

    def test_a_room_cannot_claim_two_targets(self):
        owner = _user('two_owner')
        project = _project(owner, 'Two', 'twotarget')
        task = ProjectTask.objects.create(project=project, title='t')
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChatRoom.objects.create(
                    name='confused', scope=ChatRoom.SCOPE_PROJECT,
                    project=project, task=task,
                )

    def test_global_rooms_carry_no_target(self):
        owner = _user('glob_owner')
        project = _project(owner, 'G', 'g')
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChatRoom.objects.create(
                    name='global with a project', room_type='IT', project=project,
                )


@pytest.mark.django_db
class TestThreads:
    def _root(self):
        owner = _user('thread_owner')
        room = ChatRoom.for_project(_project(owner, 'Th', 'th'))
        return room, owner, ChatMessage.objects.create(
            room=room, sender=owner, content='root',
        )

    def test_a_root_has_no_thread_root(self):
        _, _, root = self._root()
        assert root.is_thread_root
        assert root.reply_count == 0
        assert root.last_reply_at is None

    def test_replies_attach_to_the_root_and_update_its_counters(self):
        room, owner, root = self._root()
        ChatMessage.post_reply(root, owner, 'first')
        ChatMessage.post_reply(root, owner, 'second')

        root.refresh_from_db()
        assert root.reply_count == 2
        assert root.last_reply_at is not None
        assert root.thread_replies.count() == 2

    def test_replying_to_a_reply_joins_the_same_thread(self):
        room, owner, root = self._root()
        first = ChatMessage.post_reply(root, owner, 'first')
        second = ChatMessage.post_reply(first, owner, 'reply to the reply')

        # Flat, not nested: arbitrary depth has no sane rendering on a phone, and
        # the count on the root would stop meaning anything.
        assert second.thread_root_id == root.pk
        root.refresh_from_db()
        assert root.reply_count == 2

    def test_a_channel_lists_roots_without_their_replies(self):
        room, owner, root = self._root()
        ChatMessage.post_reply(root, owner, 'hidden in the thread')
        other = ChatMessage.objects.create(room=room, sender=owner, content='second root')

        roots = list(room.messages.filter(thread_root__isnull=True).order_by('created_at'))

        assert [m.pk for m in roots] == [root.pk, other.pk]
        assert room.messages.count() == 3

    def test_messages_come_back_oldest_first_by_default(self):
        room, owner, root = self._root()
        later = ChatMessage.objects.create(room=room, sender=owner, content='later')

        # Pinned, not relying on the clock advancing between two auto_now_add
        # rows: on Windows both can land on the identical microsecond, and then
        # ordering by created_at alone is arbitrary and this test is flaky.
        now = timezone.now()
        ChatMessage.objects.filter(pk=root.pk).update(created_at=now - timedelta(minutes=1))
        ChatMessage.objects.filter(pk=later.pk).update(created_at=now)

        # Meta.ordering was ['-is_bumped', '-created_at'], which floated a bumped
        # message above everything for good and returned it as "the latest".
        ChatMessage.objects.filter(pk=root.pk).update(is_bumped=True)

        assert [m.pk for m in room.messages.all()] == [root.pk, later.pk]
        assert room.messages.last().pk == later.pk


@pytest.mark.django_db
class TestReadState:
    def _channel(self):
        owner = _user('read_owner')
        return ChatRoom.for_project(_project(owner, 'R', 'r')), owner

    def test_never_opened_means_everything_is_unread(self):
        room, owner = self._channel()
        reader = _user('reader')
        for i in range(3):
            ChatMessage.objects.create(room=room, sender=owner, content=str(i))

        membership = ChannelMembership.objects.create(channel=room, user=reader)
        assert membership.unread_count() == 3

    def test_your_own_messages_are_not_unread(self):
        room, owner = self._channel()
        membership = ChannelMembership.objects.create(channel=room, user=owner)
        ChatMessage.objects.create(room=room, sender=owner, content='mine')

        # Your own message arriving is not news.
        assert membership.unread_count() == 0

    def test_only_messages_after_last_read_count(self):
        room, owner = self._channel()
        reader = _user('reader2')
        seen = ChatMessage.objects.create(room=room, sender=owner, content='seen')
        unseen = ChatMessage.objects.create(room=room, sender=owner, content='unseen')

        # Timestamps are pinned rather than relying on the clock advancing between
        # two auto_now_add rows. On Windows the system clock granularity is coarse
        # enough that both rows can land on the identical microsecond, which made
        # the strict > comparison return 0 and the test flaky rather than wrong.
        now = timezone.now()
        ChatMessage.objects.filter(pk=seen.pk).update(created_at=now - timedelta(minutes=2))
        ChatMessage.objects.filter(pk=unseen.pk).update(created_at=now)

        membership = ChannelMembership.objects.create(
            channel=room, user=reader, last_read_at=now - timedelta(minutes=1),
        )
        assert membership.unread_count() == 1

    def test_thread_replies_count_as_unread(self):
        room, owner = self._channel()
        reader = _user('reader3')
        root = ChatMessage.objects.create(room=room, sender=owner, content='root')
        ChatMessage.post_reply(root, owner, 'in thread')

        membership = ChannelMembership.objects.create(channel=room, user=reader)
        # An unanswered thread is still something waiting for you, so it has to
        # surface on the channel rather than hide inside it.
        assert membership.unread_count() == 2

    def test_messages_deleted_for_everyone_are_not_unread(self):
        room, owner = self._channel()
        reader = _user('reader4')
        ChatMessage.objects.create(
            room=room, sender=owner, content='gone', deleted_for_everyone=True,
        )
        membership = ChannelMembership.objects.create(channel=room, user=reader)
        assert membership.unread_count() == 0

    def test_one_membership_per_user_per_channel(self):
        room, owner = self._channel()
        ChannelMembership.objects.create(channel=room, user=owner)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                ChannelMembership.objects.create(channel=room, user=owner)


@pytest.mark.django_db
class TestProjectChannelAPI:
    """The flow the project page actually performs, end to end.

    The previous slice shipped the schema with no API and no UI, so there was
    nothing to find in the product. These exercise the requests the Channel tab
    makes, in order.
    """

    def _client(self, user):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _rows(self, response):
        data = response.data
        return data.get('results', data) if hasattr(data, 'get') else data

    def test_opening_a_project_creates_its_channel(self):
        owner = _user('api_owner')
        project = _project(owner, 'API', 'api-proj')

        assert not ChatRoom.objects.filter(project=project).exists()
        resp = self._client(owner).get(f'/api/projects/projects/{project.slug}/channel/')

        assert resp.status_code == 200, resp.data
        assert resp.data['scope'] == ChatRoom.SCOPE_PROJECT
        assert ChatRoom.objects.filter(project=project).count() == 1

        # Idempotent: opening the tab twice must not make a second channel.
        self._client(owner).get(f'/api/projects/projects/{project.slug}/channel/')
        assert ChatRoom.objects.filter(project=project).count() == 1

    def test_posting_and_reading_back(self):
        owner = _user('api_poster')
        project = _project(owner, 'P', 'post-proj')
        client = self._client(owner)
        room_id = client.get(f'/api/projects/projects/{project.slug}/channel/').data['id']

        posted = client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'first message'}, format='json',
        )
        assert posted.status_code == 201, posted.data

        listed = client.get('/api/community/chat/messages/', {'room': room_id})
        assert [m['content'] for m in self._rows(listed)] == ['first message']

    def test_a_reply_stays_in_its_thread(self):
        owner = _user('api_thread')
        project = _project(owner, 'T', 'thread-proj')
        client = self._client(owner)
        room_id = client.get(f'/api/projects/projects/{project.slug}/channel/').data['id']
        root_id = client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'root'}, format='json',
        ).data['id']

        reply = client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'in the thread', 'thread_root': root_id},
            format='json',
        )
        assert reply.status_code == 201, reply.data

        # The channel shows roots only, so one long thread cannot bury the rest.
        channel = self._rows(client.get('/api/community/chat/messages/', {'room': room_id}))
        assert [m['content'] for m in channel] == ['root']
        assert channel[0]['reply_count'] == 1
        assert channel[0]['last_reply_at'] is not None

        thread = self._rows(client.get('/api/community/chat/messages/', {'thread': root_id}))
        assert [m['content'] for m in thread] == ['in the thread']

    def test_an_outsider_cannot_reach_a_private_projects_channel(self):
        owner = _user('api_owner2')
        outsider = _user('api_outsider')
        project = _project(owner, 'Private', 'private-proj')  # visibility defaults private
        self._client(owner).get(f'/api/projects/projects/{project.slug}/channel/')

        resp = self._client(outsider).get(f'/api/projects/projects/{project.slug}/channel/')
        # A channel must not be a way around the project's visibility.
        assert resp.status_code in (403, 404), resp.status_code

    def test_marking_read_clears_the_unread_count(self):
        owner = _user('api_reader_owner')
        member = _user('api_reader')
        project = _project(owner, 'R', 'read-proj')
        project.visibility = 'public'
        project.save(update_fields=['visibility'])

        room = ChatRoom.for_project(project)
        ChatMessage.objects.create(room=room, sender=owner, content='unread one')

        client = self._client(member)
        before = client.get(f'/api/projects/projects/{project.slug}/channel/')
        assert before.data['unread_count'] == 1, before.data

        marked = client.post(f'/api/community/chat/rooms/{room.id}/read/')
        assert marked.status_code == 200, marked.data

        after = client.get(f'/api/projects/projects/{project.slug}/channel/')
        assert after.data['unread_count'] == 0

    def test_a_project_channel_is_reachable_through_the_rooms_viewset(self):
        # It has no room_type, and that viewset used to filter on room_type alone,
        # which made every detail route on a project channel a 404 — including the
        # read endpoint above.
        owner = _user('api_rooms')
        project = _project(owner, 'V', 'visible-proj')
        room = ChatRoom.for_project(project)

        resp = self._client(owner).get(f'/api/community/chat/rooms/{room.id}/')
        assert resp.status_code == 200, resp.status_code


@pytest.mark.django_db
class TestWorkspaceSidebar:
    """The one request that draws the sidebar.

    Channels and tasks come back together so the two halves cannot render at
    different times, and so a per-task channel lookup is not one query per row.
    """

    def _client(self, user):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_sidebar_lists_the_channel_and_the_tasks(self):
        owner = _user('ws_owner')
        project = _project(owner, 'WS', 'ws-proj')
        ProjectTask.objects.create(project=project, title='First task')
        ProjectTask.objects.create(project=project, title='Second task')

        resp = self._client(owner).get(f'/api/projects/projects/{project.slug}/workspace/')

        assert resp.status_code == 200, resp.data
        assert resp.data['project']['name'] == 'WS'
        assert len(resp.data['channels']) == 1
        assert [t['title'] for t in resp.data['tasks']] == ['First task', 'Second task']

    def test_listing_tasks_does_not_create_their_channels(self):
        owner = _user('ws_lazy')
        project = _project(owner, 'Lazy', 'lazy-proj')
        for i in range(3):
            ProjectTask.objects.create(project=project, title=f'task {i}')

        resp = self._client(owner).get(f'/api/projects/projects/{project.slug}/workspace/')

        # Drawing a sidebar must not conjure a channel per task — that is the
        # whole reason task channels are lazy.
        assert all(t['channel_id'] is None for t in resp.data['tasks'])
        assert ChatRoom.objects.filter(scope=ChatRoom.SCOPE_TASK).count() == 0

    def test_opening_a_task_creates_its_channel_and_the_sidebar_then_shows_it(self):
        owner = _user('ws_open')
        project = _project(owner, 'Open', 'open-proj')
        task = ProjectTask.objects.create(project=project, title='Discuss me')
        client = self._client(owner)

        opened = client.get(f'/api/projects/tasks/{task.id}/channel/')
        assert opened.status_code == 200, opened.data
        assert opened.data['scope'] == ChatRoom.SCOPE_TASK

        sidebar = client.get(f'/api/projects/projects/{project.slug}/workspace/')
        row = next(t for t in sidebar.data['tasks'] if t['id'] == str(task.id))
        assert row['channel_id'] == opened.data['id']

    def test_unread_badges_are_per_channel(self):
        owner = _user('ws_badge_owner')
        member = _user('ws_badge_member')
        project = _project(owner, 'Badge', 'badge-proj')
        project.visibility = 'public'
        project.save(update_fields=['visibility'])
        task = ProjectTask.objects.create(project=project, title='Noisy task')

        project_room = ChatRoom.for_project(project)
        task_room = ChatRoom.for_task(task)
        ChatMessage.objects.create(room=project_room, sender=owner, content='p1')
        ChatMessage.objects.create(room=task_room, sender=owner, content='t1')
        ChatMessage.objects.create(room=task_room, sender=owner, content='t2')

        data = self._client(member).get(
            f'/api/projects/projects/{project.slug}/workspace/'
        ).data

        assert data['channels'][0]['unread_count'] == 1
        row = next(t for t in data['tasks'] if t['id'] == str(task.id))
        assert row['unread_count'] == 2

    def test_the_sidebar_stays_a_bounded_number_of_queries(
        self, django_assert_max_num_queries,
    ):
        owner = _user('ws_perf')
        project = _project(owner, 'Perf', 'perf-proj')
        for i in range(15):
            task = ProjectTask.objects.create(project=project, title=f't{i}')
            ChatRoom.for_task(task)

        client = self._client(owner)
        # Without prefetching channels and batching the membership lookup this is
        # several queries per task, and the sidebar is the first thing that loads.
        with django_assert_max_num_queries(40):
            resp = client.get(f'/api/projects/projects/{project.slug}/workspace/')
        assert resp.status_code == 200
        assert len(resp.data['tasks']) == 15

    def test_an_outsider_cannot_read_the_sidebar_of_a_private_project(self):
        owner = _user('ws_priv_owner')
        outsider = _user('ws_priv_outsider')
        project = _project(owner, 'Priv', 'priv-ws-proj')

        resp = self._client(outsider).get(f'/api/projects/projects/{project.slug}/workspace/')
        assert resp.status_code in (403, 404), resp.status_code


@pytest.mark.django_db
class TestReadableBy:
    """The predicate the REST API and the WebSocket consumer both use.

    This is the security-critical piece of the realtime work: if the socket were
    more permissive than the API, subscribing to a channel id would be a way to
    read a private project's discussion. Both call this, so it is tested once and
    neither can drift from it.
    """

    def test_global_rooms_follow_the_users_program(self):
        cs = ChatRoom.objects.create(name='CS', room_type='CS')
        it = ChatRoom.objects.create(name='IT', room_type='IT')
        glob = ChatRoom.objects.create(name='Global', room_type='GLOBAL')

        student = _user('rb_cs')
        student.program = 'BSCS'
        student.save(update_fields=['program'])

        readable = set(ChatRoom.objects.readable_by(student).values_list('id', flat=True))
        assert cs.id in readable
        assert glob.id in readable
        assert it.id not in readable

    def test_a_private_projects_channel_is_hidden_from_outsiders(self):
        owner = _user('rb_owner')
        outsider = _user('rb_outsider')
        room = ChatRoom.for_project(_project(owner, 'Priv', 'rb-priv'))

        assert ChatRoom.objects.readable_by(owner).filter(id=room.id).exists()
        assert not ChatRoom.objects.readable_by(outsider).filter(id=room.id).exists()

    def test_a_public_projects_channel_is_readable_by_anyone(self):
        owner = _user('rb_pub_owner')
        other = _user('rb_pub_other')
        project = _project(owner, 'Pub', 'rb-pub')
        project.visibility = 'public'
        project.save(update_fields=['visibility'])
        room = ChatRoom.for_project(project)

        assert ChatRoom.objects.readable_by(other).filter(id=room.id).exists()

    def test_a_task_channel_follows_its_projects_visibility(self):
        owner = _user('rb_task_owner')
        outsider = _user('rb_task_outsider')
        project = _project(owner, 'T', 'rb-task')
        task = ProjectTask.objects.create(project=project, title='secret work')
        room = ChatRoom.for_task(task)

        assert ChatRoom.objects.readable_by(owner).filter(id=room.id).exists()
        assert not ChatRoom.objects.readable_by(outsider).filter(id=room.id).exists()


@pytest.mark.django_db
class TestAlsoSendToChannel:
    """Slack's "also send to channel" on a thread reply."""

    def _client(self, user):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _setup(self, name):
        owner = _user(name)
        project = _project(owner, 'AS', f'{name}-proj')
        client = self._client(owner)
        room_id = client.get(f'/api/projects/projects/{project.slug}/channel/').data['id']
        root_id = client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'root'}, format='json',
        ).data['id']
        return client, room_id, root_id

    def _channel_contents(self, client, room_id):
        resp = client.get('/api/community/chat/messages/', {'room': room_id})
        rows = resp.data.get('results', resp.data)
        return [m['content'] for m in rows]

    def test_off_by_default_the_reply_stays_in_the_thread(self):
        client, room_id, root_id = self._setup('as_off')
        client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'quiet reply', 'thread_root': root_id},
            format='json',
        )
        assert self._channel_contents(client, room_id) == ['root']

    def test_on_it_also_appears_in_the_channel(self):
        client, room_id, root_id = self._setup('as_on')
        client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'loud reply', 'thread_root': root_id,
             'also_send_to_channel': True},
            format='json',
        )
        # A real second row, not a flag: no reader of the channel has to know to
        # un-hide certain replies.
        assert self._channel_contents(client, room_id) == ['root', 'loud reply']

    def test_the_echo_does_not_inflate_the_reply_count(self):
        client, room_id, root_id = self._setup('as_count')
        client.post(
            '/api/community/chat/messages/',
            {'room': room_id, 'content': 'once', 'thread_root': root_id,
             'also_send_to_channel': True},
            format='json',
        )
        thread = client.get('/api/community/chat/messages/', {'thread': root_id})
        rows = thread.data.get('results', thread.data)

        assert len(rows) == 1, 'the channel echo must not become a second reply'
        root = ChatMessage.objects.get(pk=root_id)
        assert root.reply_count == 1


@pytest.mark.django_db
class TestChannelReactions:
    def test_reacting_toggles_and_shows_up_in_the_summary(self):
        from rest_framework.test import APIClient
        owner = _user('rx_owner')
        room = ChatRoom.for_project(_project(owner, 'RX', 'rx-proj'))
        message = ChatMessage.objects.create(room=room, sender=owner, content='react to me')

        client = APIClient()
        client.force_authenticate(owner)

        added = client.post(f'/api/community/chat/messages/{message.id}/react/',
                            {'reaction': '👍'}, format='json')
        assert added.status_code == 200 and added.data['action'] == 'added'

        listed = client.get('/api/community/chat/messages/', {'room': room.id})
        rows = listed.data.get('results', listed.data)
        entry = rows[0]['reactions_summary']['👍']
        assert entry['count'] == 1
        assert entry['reacted_by_me'] is True

        removed = client.post(f'/api/community/chat/messages/{message.id}/react/',
                              {'reaction': '👍'}, format='json')
        assert removed.data['action'] == 'removed'

        again = client.get('/api/community/chat/messages/', {'room': room.id})
        rows = again.data.get('results', again.data)
        assert rows[0]['reactions_summary'] == {}
