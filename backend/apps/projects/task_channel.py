"""A task's history, written into its channel.

Creating a task, assigning it and moving it on the board already wrote a
ProjectActivity row and a notification. Neither is visible from the channel, so
the conversation about a task and the record of what happened to it lived in two
places that never referred to each other.

These post the same facts as messages in the task's own channel, which makes them
threadable — the discussion about a status change hangs off the change itself.

Imported lazily inside the functions: the community app holds the FK to
ProjectTask, so importing it at module scope here would close the loop.
"""
import logging

logger = logging.getLogger(__name__)


def _status_label(value):
    from .models import ProjectTask
    return dict(ProjectTask.STATUS_CHOICES).get(value, value)


def _post(task, actor, event_type, content):
    """Append one event to the task's channel and tell the project channel.

    Best-effort, like broadcast.publish: a task update must not fail because the
    channel it reports to could not be written.
    """
    from apps.community import broadcast
    from apps.community.models import ChatMessage, ChatRoom
    from apps.community.serializers import ChatMessageSerializer

    try:
        room = ChatRoom.for_task(task)
        message = ChatMessage.objects.create(
            room=room, sender=actor, content=content, event_type=event_type,
        )
        # No request in the context on purpose. is_own_message and reacted_by_me
        # are viewer-specific, and one payload goes to every subscriber.
        broadcast.message_created(message, ChatMessageSerializer(message).data)
        # Both rooms: the sidebar and tracker show every task's status, and the
        # reader might be sitting in either the project channel or this task's.
        broadcast.task_changed(ChatRoom.for_project(task.project).id, task)
        broadcast.task_changed(room.id, task)
        return message
    except Exception:
        logger.warning('task event %s not posted for task %s',
                       event_type, task.pk, exc_info=True)
        return None


def task_created(task, actor):
    from apps.community.models import ChatMessage

    assignee = task.assigned_to
    text = 'created this task'
    if assignee is not None:
        text = f'created this task and assigned it to {assignee.username}'
    return _post(task, actor, ChatMessage.EVENT_TASK_CREATED, text)


def task_assigned(task, actor, previous):
    from apps.community.models import ChatMessage

    if task.assigned_to is None:
        text = f'unassigned this from {previous.username}' if previous else 'unassigned this'
    elif previous is None:
        text = f'assigned this to {task.assigned_to.username}'
    else:
        text = f'reassigned this from {previous.username} to {task.assigned_to.username}'
    return _post(task, actor, ChatMessage.EVENT_TASK_ASSIGNED, text)


def task_status_changed(task, actor, previous):
    from apps.community.models import ChatMessage

    text = f'moved this from {_status_label(previous)} to {_status_label(task.status)}'
    return _post(task, actor, ChatMessage.EVENT_TASK_STATUS, text)
