"""
The container limits, pinned.

These exist because of a real outage rather than a hypothetical one. A probe
run by hand on production omitted `--memory` and `--cpus` and fed the process
`/dev/zero`; it allocated until the box exhausted RAM, fell into swap, and
stopped scheduling sshd. The site was unreachable and the machine could not be
reached to stop it.

So what is asserted here is not "the function works". It is that there is **no
way to obtain a container without each bound**, because the thing that failed
was human memory, and a test is the only part of this that does not get tired.
"""
import pytest

from apps.lab import sandbox


@pytest.fixture
def argv():
    return sandbox.container_argv('python', host_dir='/tmp/x', name='lab_test')


def flag(argv, name):
    """The value following `name`, or None."""
    return argv[argv.index(name) + 1] if name in argv else None


class TestEveryBoundIsPresent:
    @pytest.mark.parametrize('option', [
        '--memory',        # the one whose absence took the site down
        '--memory-swap',   # without it, swap defeats --memory
        '--cpus',
        '--pids-limit',
        '--network',
        '--read-only',
        '--cap-drop',
        '--security-opt',
    ])
    def test_the_option_is_always_supplied(self, argv, option):
        assert option in argv, f'{option} missing — this is how the box died'

    def test_memory_and_swap_are_equal_so_swap_cannot_be_used_to_exceed_it(self, argv):
        # Docker's default is memory-swap = 2 × memory. A program capped at
        # 256 MB of RAM could then take 512 MB of swap, and swap thrash is what
        # actually stops a small box from scheduling sshd.
        assert flag(argv, '--memory') == flag(argv, '--memory-swap')

    def test_the_network_is_off(self, argv):
        assert flag(argv, '--network') == 'none'

    def test_the_source_is_mounted_read_only(self, argv):
        mount = flag(argv, '-v')
        assert mount.endswith(':ro'), 'a program must not rewrite its own source'

    def test_the_container_is_named_so_it_can_be_killed(self, argv):
        # Killing the docker client does not stop the container. Without a name
        # there is no handle to kill, which is why the runaway survived.
        assert flag(argv, '--name') == 'lab_test'
        assert sandbox.kill_argv('lab_test') == [
            'docker', 'kill', '--signal', 'KILL', 'lab_test']

    def test_privileges_are_dropped(self, argv):
        assert flag(argv, '--cap-drop') == 'ALL'
        assert flag(argv, '--security-opt') == 'no-new-privileges'


class TestThereIsNoWayAround:
    def test_the_function_takes_no_argument_that_disables_limits(self):
        import inspect

        parameters = set(inspect.signature(sandbox.container_argv).parameters)

        # If someone adds a `limits=False` escape hatch, it will be used at 2am
        # by somebody debugging, and that is the whole story of the outage.
        assert parameters == {'language', 'host_dir', 'name'}

    def test_every_supported_runtime_produces_a_bounded_container(self):
        for language in sandbox.RUNTIMES:
            argv = sandbox.container_argv(language, host_dir='/tmp/x', name='n')
            for option in ('--memory', '--memory-swap', '--cpus', '--pids-limit'):
                assert option in argv, f'{language} would run unbounded'

    def test_an_unknown_language_is_refused_rather_than_improvised(self):
        with pytest.raises(sandbox.UnsupportedLanguage):
            sandbox.container_argv('rust', host_dir='/tmp/x', name='n')

    def test_a_planned_language_says_so_plainly(self):
        with pytest.raises(sandbox.UnsupportedLanguage, match='not available'):
            sandbox.container_argv('java', host_dir='/tmp/x', name='n')


class TestTheLimitsAreSane:
    def test_memory_is_bounded_well_below_the_box(self):
        # The box has 3.8 GB. A cap anywhere near that lets one student stall
        # everyone else.
        assert 0 < sandbox.MEMORY_MB <= 512

    def test_cpu_is_a_fraction_so_one_run_cannot_own_a_core(self):
        assert 0 < float(sandbox.CPUS) <= 1.0

    def test_a_session_cannot_run_forever(self):
        assert 0 < sandbox.WALL_CLOCK_SECONDS <= 600
        assert 0 < sandbox.IDLE_SECONDS < sandbox.WALL_CLOCK_SECONDS
