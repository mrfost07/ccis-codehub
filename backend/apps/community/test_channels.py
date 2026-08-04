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
