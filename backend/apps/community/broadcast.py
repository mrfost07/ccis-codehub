"""
Publishing channel changes to connected sockets.

One place, called from the REST layer after a change is committed. The REST
endpoint stays the only write path — the consumer is read-only — so this is the
single point where "something happened in a channel" becomes "everyone watching
it hears about it".

Deliberately best-effort. If Redis is unavailable the write has already been
persisted and the client's own response still reflects it; the other clients fall
back to their poll. A channel layer hiccup must not turn a successful POST into a
500.
"""
import logging

logger = logging.getLogger(__name__)


def publish(room_id, payload):
    """Send `payload` to everyone subscribed to this channel."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f'channel_{room_id}',
            {'type': 'channel_event', 'payload': payload},
        )
    except Exception:
        # Logged, never raised: see the module docstring.
        logger.warning('channel broadcast failed for room %s', room_id, exc_info=True)


def message_created(message, serialized):
    publish(message.room_id, {
        'event': 'message.created',
        # Thread replies must not be appended to the channel by listeners; they
        # belong to their thread, exactly as the REST list does it.
        'thread_root': str(message.thread_root_id) if message.thread_root_id else None,
        'message': serialized,
    })


def reaction_changed(message, serialized):
    publish(message.room_id, {
        'event': 'message.reaction',
        'message_id': str(message.id),
        'message': serialized,
    })


def task_changed(project_room_id, task):
    """Tell the project channel that one of its tasks moved.

    Sent to the project room, not the task room: the sidebar, the tracker and the
    board all show a task's status, and none of them is inside the task channel.
    """
    publish(project_room_id, {
        'event': 'task.changed',
        'task': {
            'id': str(task.id),
            'title': task.title,
            'status': task.status,
        },
    })
