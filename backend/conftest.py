"""
Shared pytest fixtures.

Created to fix a real ordering bug rather than pre-emptively.
"""
import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _isolate_cache():
    """Clear the cache around every test.

    CAPTCHA tokens (apps/accounts/captcha.py) and DRF throttle counters
    (VerificationResendThrottle and friends) both live in the cache, and nothing
    reset it between tests. The database is rolled back per test by pytest-django;
    the cache was not, so state leaked forward and whether a test passed depended
    on how many tests had run before it.

    That is not hypothetical. Adding six unrelated channel tests was enough to
    push apps/accounts/test_auth_security.py::TestRegistrationPrivilegeEscalation
    ::test_legitimate_registration_still_succeeds past a captcha boundary: it
    passed alone, passed alongside the new file, and failed only in the full run
    — the worst shape of failure to diagnose, because the test that breaks is not
    the test that changed.

    Autouse so no one has to remember it, and cleared on both sides so a test
    cannot inherit leftovers or leave any.
    """
    cache.clear()
    yield
    cache.clear()
