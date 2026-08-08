"""
The execution worker.

This runs off the web process on purpose. Daphne serves the whole site from a
single process; a five-second blocking subprocess inside a request handler is
five seconds of somebody else's page not loading.

The worker's `--concurrency` is the real concurrency cap for the room. On the
two-core production box that is 2, which matches what the sandbox will give us
anyway.
"""
import logging

from celery import shared_task

from . import execution

logger = logging.getLogger(__name__)


@shared_task(name='lab.execute', bind=True, max_retries=0)
def execute_run(self, run_id: str) -> None:
    """Run one student's code and record the output.

    Deliberately never raises. A crash here would leave the student's console
    spinning forever with no way to tell whether it was their code or ours.
    """
    record = execution.mark_running(run_id)
    if record is None:
        # Superseded while queued — the student pressed Run again. Dropping it
        # is the point of superseding.
        logger.debug('lab run %s skipped', run_id)
        return

    from apps.learning.code_executor import CodeExecutor

    try:
        # One "test case" with no expectation: the lab has no expected output,
        # so this is the compiler behaviour the feature is built around — run
        # it, show what it printed.
        result = CodeExecutor().run(
            record['language'], record['code'],
            [{'input': record.get('stdin') or '', 'expected_output': ''}])
        first = (result.get('results') or [{}])[0]
        execution.finish(
            run_id,
            stdout=first.get('stdout', ''),
            stderr=first.get('stderr', ''),
            error=first.get('error'),
        )
    except Exception as exc:                       # noqa: BLE001 - see docstring
        logger.exception('lab run %s failed', run_id)
        execution.finish(run_id, stderr='The execution service failed.',
                         error='internal_error')
