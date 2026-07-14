"""
CAPTCHA single-use (Req 5) and DEBUG boolean-parsing (Req 30) tests.
"""
import os
import re

import environ
import pytest
from django.core.cache import cache

from apps.accounts.captcha import generate_captcha_challenge, verify_captcha_token


def _solve(question: str) -> int:
    a, op, b = re.search(r'(\d+)\s*([+\-×])\s*(\d+)', question).groups()
    a, b = int(a), int(b)
    return {'+': a + b, '-': a - b, '×': a * b}[op]


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


class TestCaptchaSingleUse:
    """Req 5: a verified CAPTCHA token cannot be replayed within its TTL."""

    def test_fresh_token_verifies(self):
        challenge = generate_captcha_challenge()
        ok, err = verify_captcha_token(challenge['token'], _solve(challenge['question']))
        assert ok is True
        assert err is None

    def test_replay_is_rejected(self):
        challenge = generate_captcha_challenge()
        answer = _solve(challenge['question'])

        first_ok, _ = verify_captcha_token(challenge['token'], answer)
        assert first_ok is True

        second_ok, err = verify_captcha_token(challenge['token'], answer)
        assert second_ok is False
        assert 'already been used' in (err or '').lower()

    def test_wrong_answer_does_not_consume_token(self):
        """A failed attempt must not burn the token (legitimate retry works)."""
        challenge = generate_captcha_challenge()
        answer = _solve(challenge['question'])

        bad_ok, _ = verify_captcha_token(challenge['token'], answer + 1)
        assert bad_ok is False

        good_ok, _ = verify_captcha_token(challenge['token'], answer)
        assert good_ok is True


class TestDebugBooleanParsing:
    """Req 30: DJANGO_DEBUG must parse as a boolean, not a truthy string."""

    def test_false_string_parses_as_false(self):
        env = environ.Env()
        os.environ['CCIS_TEST_DEBUG'] = 'False'
        try:
            assert env.bool('CCIS_TEST_DEBUG') is False
        finally:
            del os.environ['CCIS_TEST_DEBUG']

    def test_true_string_parses_as_true(self):
        env = environ.Env()
        os.environ['CCIS_TEST_DEBUG'] = 'True'
        try:
            assert env.bool('CCIS_TEST_DEBUG') is True
        finally:
            del os.environ['CCIS_TEST_DEBUG']
