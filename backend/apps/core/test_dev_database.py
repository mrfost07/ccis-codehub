"""
Developing against the wrong database.

The local .env pointed at a remote Neon project — the one kept as the production
fallback snapshot — so `migrate`, `flush` or a stray `loaddata` from a laptop
wrote to the only rollback copy there is. Tests already run on in-memory SQLite;
`runserver` did not.

The branch that matters most here is the one that must NEVER fire: a warning
printed on every production boot would train everyone to ignore it.
"""
from core.settings import remote_database_warning


class TestRemoteDatabaseWarning:
    NEON = 'ep-green-mountain-ah59xuac-pooler.c-3.us-east-1.aws.neon.tech'

    def test_warns_when_debugging_against_a_remote_host(self):
        message = remote_database_warning(True, self.NEON)

        assert message is not None
        assert self.NEON in message
        # Says what to do about it, not just that something is wrong.
        assert 'USE_SQLITE=1' in message

    def test_silent_in_production(self):
        # DEBUG=False is the production case and the database is remote there by
        # design. A warning on every boot is noise that teaches people to skip it.
        assert remote_database_warning(False, self.NEON) is None

    def test_silent_for_a_local_host(self):
        for host in ('localhost', '127.0.0.1', '::1'):
            assert remote_database_warning(True, host) is None, host

    def test_silent_for_sqlite(self):
        # SQLite has no HOST at all, which is the state USE_SQLITE=1 produces.
        assert remote_database_warning(True, '') is None


class TestDebugFailsSafe:
    def test_a_missing_djangodebug_means_off(self):
        # It defaulted to True while .env_example ships DJANGO_DEBUG=True, so a
        # deploy that copied the template and skipped verify.sh served tracebacks,
        # SQL and settings to the internet. A missing value must mean off.
        import re
        from pathlib import Path

        settings_src = (Path(__file__).resolve().parents[2] / 'core' / 'settings.py').read_text(encoding='utf-8')
        match = re.search(r"DEBUG = env\.bool\('DJANGO_DEBUG',\s*default=(\w+)\)", settings_src)

        assert match, 'DEBUG is no longer read from DJANGO_DEBUG via env.bool'
        assert match.group(1) == 'False', (
            f'DJANGO_DEBUG defaults to {match.group(1)}; a box missing the variable '
            'would run in debug mode in production'
        )


class TestTestsNeverTouchTheConfiguredDatabase:
    def test_the_suite_runs_on_sqlite(self):
        # If this ever reports postgresql, a test run is creating and dropping a
        # database against whatever DATABASE_URL points at.
        from django.conf import settings

        assert 'sqlite' in settings.DATABASES['default']['ENGINE']

    def test_and_not_against_a_file_that_could_be_a_real_one(self):
        from django.conf import settings

        assert str(settings.DATABASES['default']['NAME']) in (':memory:', 'file:memorydb_default?mode=memory&cache=shared')
