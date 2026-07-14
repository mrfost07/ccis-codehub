"""Smoke tests — confirm the test harness is wired and hermetic."""
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


def test_database_is_sqlite_memory():
    """Safety guard: the suite must never run against the production DB."""
    engine = settings.DATABASES['default']['ENGINE']
    name = settings.DATABASES['default']['NAME']
    assert engine == 'django.db.backends.sqlite3'
    # pytest-django rewrites ':memory:' to a shared in-memory URI; either is fine.
    assert 'memory' in name


@pytest.mark.django_db
def test_can_create_user():
    user = User.objects.create_user(
        username='smoke',
        email='smoke@ssct.edu.ph',
        password='pass12345',
    )
    assert user.pk is not None
    assert user.check_password('pass12345')
