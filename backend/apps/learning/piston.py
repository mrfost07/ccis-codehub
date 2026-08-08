"""
Execution sandbox.

Student code used to run as a plain subprocess on the application server. That
is not a sandbox and the executor's own docstring said so: no filesystem,
network or memory isolation. Verified on a copy of the code — a submission
could list the filesystem root and walk upwards, as the user that owns
`backend/.env`, which holds the database URL, the Django secret key and every
API key on the platform.

Piston runs each execution in a throwaway jail with no network and hard
resource caps. Measured against the same probes after the switch: the
filesystem root shows the jail rather than the host, reading the application
directory fails, opening a socket fails, and a fork bomb hits the process cap.

It also answers the other half of the problem — a per-language package manager,
so a live lab can offer real libraries without us curating an image by hand, and
Java compiles at all (the box has no `javac`).

The service listens on loopback only. It executes arbitrary code on request, so
exposing its port would be a worse hole than the one it closes.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

# Our language keys to what Piston calls them. Versions are pinned: an
# unpinned runtime would silently change what students' code runs against
# between one lab session and the next.
RUNTIMES = {
    'python': ('python', '3.12.0'),
    'javascript': ('javascript', '20.11.1'),
    'java': ('java', '15.0.2'),
    'cpp': ('c++', '10.2.0'),
}

MAX_OUTPUT_BYTES = 16_384


class PistonUnavailable(RuntimeError):
    """The sandbox did not answer. Callers must fail closed, never fall back."""


def enabled() -> bool:
    return bool(getattr(settings, 'PISTON_URL', ''))


def execute(language: str, source: str, stdin: str = '', *,
            filename: str = 'solution',
            run_timeout_ms: int = 5_000,
            compile_timeout_ms: int = 15_000,
            memory_bytes: int = 256 * 1024 * 1024) -> dict:
    """Run `source` once and return {stdout, stderr, compile_error, timed_out}.

    Raises PistonUnavailable if the sandbox cannot be reached. That is
    deliberately not recoverable here: silently running unsandboxed on the
    application server is the failure this module exists to prevent.
    """
    if language not in RUNTIMES:
        raise ValueError(f'unsupported language: {language}')

    piston_language, version = RUNTIMES[language]
    ext = {'python': '.py', 'javascript': '.js', 'java': '.java', 'cpp': '.cpp'}[language]

    payload = json.dumps({
        'language': piston_language,
        'version': version,
        'files': [{'name': f'{filename}{ext}', 'content': source}],
        'stdin': stdin,
        'run_timeout': run_timeout_ms,
        'compile_timeout': compile_timeout_ms,
        'run_memory_limit': memory_bytes,
    }).encode()

    url = settings.PISTON_URL.rstrip('/') + '/api/v2/execute'
    request = urllib.request.Request(
        url, data=payload, headers={'Content-Type': 'application/json'})

    try:
        # Generous margin over the run timeout the sandbox itself enforces —
        # this is the transport giving up, not the execution.
        with urllib.request.urlopen(request, timeout=(run_timeout_ms + compile_timeout_ms) / 1000 + 10) as response:
            body = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors='replace')[:200]
        raise PistonUnavailable(f'sandbox rejected the request: {exc.code} {detail}') from exc
    except Exception as exc:
        raise PistonUnavailable(f'sandbox unreachable: {exc}') from exc

    compile_stage = body.get('compile') or {}
    run_stage = body.get('run') or {}

    compile_error = None
    if compile_stage and compile_stage.get('code') not in (0, None):
        compile_error = (compile_stage.get('stderr')
                         or compile_stage.get('output')
                         or 'Compilation failed')[:MAX_OUTPUT_BYTES]

    # Piston reports a killed run through the signal, which is how a timeout
    # or an out-of-memory kill surfaces.
    signal = run_stage.get('signal')
    timed_out = signal in ('SIGKILL', 'SIGXCPU', 'SIGTERM')

    return {
        'stdout': (run_stage.get('stdout') or '')[:MAX_OUTPUT_BYTES],
        'stderr': (run_stage.get('stderr') or '')[:MAX_OUTPUT_BYTES],
        'compile_error': compile_error,
        'timed_out': timed_out,
        'signal': signal,
    }
