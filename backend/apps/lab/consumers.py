"""
An interactive terminal for the lab.

The first version of this ran code the way a judge does: you supplied stdin up
front and got the whole output back. That is wrong for a classroom. In an IDE
you press Run, and if the program asks a question it waits while you answer it.

So a run here is a live process, not a request. The container stays up, its
output streams as it appears, and what the student types goes to its stdin.
`python -u` is not decoration — without unbuffered output a prompt written
without a newline sits in the pipe and the student waits for a question that
has already been asked.

Every container is built by apps/lab/sandbox.py, which cannot produce one
without resource limits. That is not belt-and-braces: an unbounded container
took this site down.
"""
import asyncio
import json
import logging
import os
import shutil
import tempfile
import uuid

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache

from . import sandbox

logger = logging.getLogger(__name__)

# How many containers may exist at once across the whole box. Two cores, and
# the sandbox gives each run half of one; past this the room is better served
# by a queue than by everyone sharing a stalled machine.
MAX_CONCURRENT = 8
CONCURRENCY_KEY = 'lab:containers:running'


class LabTerminalConsumer(AsyncWebsocketConsumer):
    """One student's terminal, for the life of one browser tab."""

    async def connect(self):
        self.lab_id = self.scope['url_route']['kwargs']['lab_id']
        self.user = self.scope.get('user')
        self.process = None
        self.container = None
        self.workdir = None
        self.pump = None
        self.watchdog = None

        if self.user is None or not self.user.is_authenticated:
            await self.close(code=4401)
            return
        if not await self._is_participant():
            await self.close(code=4403)
            return

        await self.accept()
        await self._send('ready', {})

    async def disconnect(self, code):
        # A closed tab must not leave a container running. This is the path
        # that matters most: students close tabs, they do not press Stop.
        await self._stop_process()

    async def receive(self, text_data=None, bytes_data=None):
        try:
            message = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            return

        kind = message.get('type')
        if kind == 'run':
            await self._run(message.get('language', ''), message.get('code', ''))
        elif kind == 'stdin':
            await self._write_stdin(message.get('data', ''))
        elif kind == 'stop':
            await self._stop_process()
            await self._send('exit', {'code': None, 'stopped': True})

    # ── running ──────────────────────────────────────────────────────────

    async def _run(self, language: str, code: str):
        await self._stop_process()          # Run replaces whatever was running

        if not code.strip():
            await self._send('error', {'detail': 'There is no code to run.'})
            return

        try:
            argv, workdir, name = await self._prepare(language, code)
        except sandbox.UnsupportedLanguage as exc:
            await self._send('error', {'detail': str(exc)})
            return

        if not self._take_slot():
            shutil.rmtree(workdir, ignore_errors=True)
            await self._send('error', {
                'detail': 'The lab is busy. Try again in a moment.'})
            return

        self.workdir, self.container = workdir, name
        try:
            self.process = await asyncio.create_subprocess_exec(
                *argv,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
        except Exception as exc:
            logger.exception('could not start a lab container')
            self._release_slot()
            shutil.rmtree(workdir, ignore_errors=True)
            await self._send('error', {'detail': 'Could not start the runtime.'})
            return

        await self._send('started', {})
        self.pump = asyncio.create_task(self._pump_output())
        self.watchdog = asyncio.create_task(self._watchdog())

    @database_sync_to_async
    def _is_participant(self) -> bool:
        from .models import LabParticipant
        return LabParticipant.objects.filter(
            lab_id=self.lab_id, student=self.user).exists()

    async def _prepare(self, language: str, code: str):
        workdir = tempfile.mkdtemp(prefix='lab_')
        runtime = sandbox.RUNTIMES.get(language)
        if runtime is None:
            # Ask sandbox to raise, so the message stays in one place.
            sandbox.container_argv(language, host_dir=workdir, name='x')
        source = os.path.join(workdir, runtime.filename)
        with open(source, 'w', encoding='utf-8') as handle:
            handle.write(code)
        os.chmod(workdir, 0o755)
        name = f'lab_{uuid.uuid4().hex[:12]}'
        return sandbox.container_argv(language, host_dir=workdir, name=name), workdir, name

    async def _pump_output(self):
        """Stream output as it appears, not when the process ends."""
        sent = 0
        try:
            while True:
                chunk = await self.process.stdout.read(1024)
                if not chunk:
                    break
                sent += len(chunk)
                if sent > sandbox.OUTPUT_BYTES:
                    await self._send('output', {
                        'data': '\n[output truncated — this program prints too much]\n'})
                    await self._stop_process()
                    return
                self.last_activity = asyncio.get_event_loop().time()
                await self._send('output', {'data': chunk.decode('utf-8', 'replace')})
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception('lab output pump failed')

        code = await self.process.wait() if self.process else None
        await self._cleanup()
        await self._send('exit', {'code': code})

    async def _watchdog(self):
        """End a session that has stopped being one.

        Two clocks: a total ceiling, and an idle cut-off for a program left
        blocked on input by a student who wandered off. Without the second, a
        container sits holding a slot until the ceiling.
        """
        started = asyncio.get_event_loop().time()
        self.last_activity = started
        try:
            while True:
                await asyncio.sleep(5)
                if self.process is None or self.process.returncode is not None:
                    return
                now = asyncio.get_event_loop().time()
                if now - started > sandbox.WALL_CLOCK_SECONDS:
                    await self._send('output', {
                        'data': '\n[stopped — this run hit the time limit]\n'})
                    await self._stop_process()
                    return
                if now - self.last_activity > sandbox.IDLE_SECONDS:
                    await self._send('output', {
                        'data': '\n[stopped — nothing happened for a while]\n'})
                    await self._stop_process()
                    return
        except asyncio.CancelledError:
            raise

    async def _write_stdin(self, data: str):
        if self.process is None or self.process.stdin is None:
            return
        try:
            self.process.stdin.write(data.encode())
            await self.process.stdin.drain()
            self.last_activity = asyncio.get_event_loop().time()
        except (BrokenPipeError, ConnectionResetError):
            pass       # the program has already exited; nothing to say

    # ── stopping ─────────────────────────────────────────────────────────

    async def _stop_process(self):
        if self.watchdog:
            self.watchdog.cancel()
            self.watchdog = None
        if self.pump:
            self.pump.cancel()
            self.pump = None
        if self.container:
            # Kill the container, not the client. Killing the client is what
            # left a runaway process holding the box.
            try:
                killer = await asyncio.create_subprocess_exec(
                    *sandbox.kill_argv(self.container),
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL)
                await asyncio.wait_for(killer.wait(), timeout=10)
            except Exception:
                logger.warning('could not kill container %s', self.container)
        await self._cleanup()

    async def _cleanup(self):
        if self.process is not None:
            self.process = None
            self._release_slot()
        if self.container:
            self.container = None
        if self.workdir:
            shutil.rmtree(self.workdir, ignore_errors=True)
            self.workdir = None

    # ── concurrency ──────────────────────────────────────────────────────

    def _take_slot(self) -> bool:
        try:
            running = cache.incr(CONCURRENCY_KEY)
        except ValueError:
            cache.add(CONCURRENCY_KEY, 1, 3600)
            running = cache.get(CONCURRENCY_KEY) or 1
        if running > MAX_CONCURRENT:
            self._release_slot()
            return False
        return True

    def _release_slot(self):
        try:
            if (cache.get(CONCURRENCY_KEY) or 0) > 0:
                cache.decr(CONCURRENCY_KEY)
        except ValueError:
            pass

    async def _send(self, kind: str, payload: dict):
        await self.send(text_data=json.dumps({'type': kind, **payload}))
