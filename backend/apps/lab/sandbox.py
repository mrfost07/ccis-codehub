"""
Building the command line for a sandboxed container.

This module exists because of an incident. Verifying that a container would
block waiting for input, I ran a probe on the production box and left off
`--memory` and `--cpus`, feeding it `/dev/zero`. The process allocated until it
exhausted 3.8 GB of RAM, fell into swap, and the kernel could no longer
schedule sshd. The site was unreachable and I could not get in to stop it.

Two lessons, both encoded here.

**`timeout` does not stop a container.** It kills the `docker` client; the
container keeps running detached from the thing that was supposed to bound it.
Limits have to be on the container itself, and `--stop-timeout` plus an
explicit kill is what actually ends it.

**A limit you have to remember is a limit you will forget.** There is no
argument to this function for turning limits off and no code path that produces
a container without them, because the failure mode of "usually remembered" is
an unreachable production box.
"""
from dataclasses import dataclass

# Deliberately conservative. A student's exercise that needs more than this is
# a student's exercise with a bug in it.
MEMORY_MB = 256
CPUS = '0.5'
PIDS = 64
OUTPUT_BYTES = 64 * 1024
WALL_CLOCK_SECONDS = 300      # a whole interactive session
IDLE_SECONDS = 120            # no input and no output for this long


@dataclass(frozen=True)
class Runtime:
    image: str
    # Argv to run the source file inside the container. {file} is substituted.
    command: tuple
    filename: str


RUNTIMES = {
    'python': Runtime('python:3.12-slim', ('python', '-u', '{file}'), 'main.py'),
    'javascript': Runtime('node:20-slim', ('node', '{file}'), 'main.js'),
}

# Compiled languages need a build step before the interactive run and are not
# wired up yet. Listing them here rather than in RUNTIMES keeps the failure a
# clear "not supported" instead of a confusing crash.
PLANNED = {'java', 'cpp'}


class UnsupportedLanguage(ValueError):
    pass


def container_argv(language: str, *, host_dir: str, name: str) -> list[str]:
    """The full `docker run` argv for one interactive execution.

    Every resource bound is applied here and none of them is optional.

    `--network none` because a student exercise has no business reaching the
    internet, and because the box's own services are on loopback.
    `--read-only` with the source mounted read-only: nothing the program writes
    survives, and it cannot modify the code it was given.
    """
    if language in PLANNED:
        raise UnsupportedLanguage(
            f'{language} is not available in the lab yet')
    if language not in RUNTIMES:
        raise UnsupportedLanguage(f'unsupported language: {language}')

    runtime = RUNTIMES[language]
    return [
        'docker', 'run', '--rm', '-i',
        '--name', name,
        '--network', 'none',
        '--memory', f'{MEMORY_MB}m',
        # Without this the container can use swap to exceed --memory, which is
        # precisely how the box became unresponsive rather than merely slow.
        '--memory-swap', f'{MEMORY_MB}m',
        '--cpus', CPUS,
        '--pids-limit', str(PIDS),
        '--read-only',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m',
        '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges',
        '-v', f'{host_dir}:/src:ro',
        '-w', '/src',
        runtime.image,
        *[part.replace('{file}', f'/src/{runtime.filename}') for part in runtime.command],
    ]


def kill_argv(name: str) -> list[str]:
    """How to actually stop it.

    Killing the client is not enough — that was the incident. This addresses
    the container by name, which is why `container_argv` always names it.
    """
    return ['docker', 'kill', '--signal', 'KILL', name]
