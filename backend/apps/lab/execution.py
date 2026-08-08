"""
Run bookkeeping for the lab.

Runs are transient. A student presses Run dozens of times in a session and the
output matters for seconds, so none of this belongs in Postgres — a class of 60
would write tens of thousands of rows nobody reads. It lives in the cache with
a short TTL. Only a *submission* is durable.

Two problems this solves beyond storage:

**Backpressure.** A queue with no limit does not degrade, it collapses:
students press Run again because nothing happened, which adds load, which makes
nothing happen. So one run per student is in flight at a time and pressing Run
again supersedes the previous one rather than adding to the queue. That alone
caps the queue at the number of students in the room.

**An honest wait.** A spinner with no information is what makes people click
again. A deli-counter ticket gives the student a number that goes down, which
is the difference between "slow" and "broken".
"""
import time
import uuid

from django.core.cache import cache

RUN_TTL = 600           # seconds a finished run stays readable
TICKET_TTL = 3600
QUEUED, RUNNING, DONE, SUPERSEDED = 'queued', 'running', 'done', 'superseded'


def _run_key(run_id) -> str:
    return f'lab:run:{run_id}'


def _inflight_key(participant_id) -> str:
    return f'lab:inflight:{participant_id}'


def _ticket_key(lab_id) -> str:
    return f'lab:ticket:{lab_id}'


def _served_key(lab_id) -> str:
    return f'lab:served:{lab_id}'


def _next(key: str) -> int:
    """Atomic increment that also works on a cold key.

    `cache.incr` raises ValueError when the key is missing, which is the state
    every lab starts in. `cache.add` is the atomic part: it returns False if
    another request created the key first, and that caller then increments
    normally rather than both believing they hold ticket 1.

    An earlier version seeded the key and then incremented it, so the first
    caller returned 1 while leaving the counter at 2 — every lab silently
    skipped a ticket and every queue position after it was one too high.
    """
    try:
        return cache.incr(key)
    except ValueError:
        if cache.add(key, 1, TICKET_TTL):
            return 1
        return cache.incr(key)


def start(*, lab_id, participant_id, language, code, stdin='',
          problem_id=None, purpose='run') -> dict:
    """Book a run and supersede whatever that student had in flight."""
    previous_id = cache.get(_inflight_key(participant_id))
    if previous_id:
        previous = cache.get(_run_key(previous_id))
        if previous and previous['state'] == QUEUED:
            # Never executed. Mark it so the worker skips it if it is already
            # handed out — cancelling a queued Celery task is not reliable.
            previous['state'] = SUPERSEDED
            cache.set(_run_key(previous_id), previous, RUN_TTL)

    run_id = str(uuid.uuid4())
    record = {
        'id': run_id,
        'lab_id': str(lab_id),
        'participant_id': str(participant_id),
        'problem_id': str(problem_id) if problem_id else None,
        'language': language,
        'code': code,
        'stdin': stdin,
        'purpose': purpose,
        'state': QUEUED,
        'ticket': _next(_ticket_key(lab_id)),
        'stdout': '',
        'stderr': '',
        'error': None,
        'queued_at': time.time(),
    }
    cache.set(_run_key(run_id), record, RUN_TTL)
    cache.set(_inflight_key(participant_id), run_id, 120)
    return record


def get(run_id) -> dict | None:
    return cache.get(_run_key(run_id))


def mark_running(run_id) -> dict | None:
    record = get(run_id)
    if record is None or record['state'] != QUEUED:
        return None       # superseded while it waited; the worker skips it
    record['state'] = RUNNING
    cache.set(_run_key(run_id), record, RUN_TTL)
    _next(_served_key(record['lab_id']))
    return record


def finish(run_id, *, stdout='', stderr='', error=None) -> dict | None:
    record = get(run_id)
    if record is None:
        return None
    record.update({'state': DONE, 'stdout': stdout, 'stderr': stderr,
                   'error': error, 'finished_at': time.time()})
    cache.set(_run_key(run_id), record, RUN_TTL)
    if cache.get(_inflight_key(record['participant_id'])) == run_id:
        cache.delete(_inflight_key(record['participant_id']))
    return record


def queue_position(record: dict) -> int:
    """How many runs are ahead of this one. Zero once it is being served."""
    if record['state'] in (RUNNING, DONE):
        return 0
    served = cache.get(_served_key(record['lab_id'])) or 0
    return max(0, record['ticket'] - int(served) - 1)


def public(record: dict) -> dict:
    """The shape the browser sees. Never echoes the code back."""
    return {
        'run_id': record['id'],
        'state': record['state'],
        'queue_position': queue_position(record),
        'stdout': record['stdout'],
        'stderr': record['stderr'],
        'error': record['error'],
    }
