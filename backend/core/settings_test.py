"""
Test settings — isolates the suite from the production Neon database.

Importing everything from the base settings, then hard-overriding the database,
cache, channel layer, and password hashing so tests are fast, hermetic, and can
NEVER connect to the real DATABASE_URL. Always run tests with:

    DJANGO_SETTINGS_MODULE=core.settings_test   (pytest.ini sets this)
"""
from .settings import *  # noqa: F401,F403

# ── Force a throwaway in-memory SQLite DB (never touches Neon) ────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# ── Fast, deterministic infra for tests ──────────────────────────────────────
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

# Run Celery tasks inline; never require a broker in tests.
CELERY_TASK_ALWAYS_EAGER = True

# Keep debug off so tests exercise production-like code paths.
DEBUG = False

# Guarantee a signing key even if the environment omits one.
SECRET_KEY = globals().get('SECRET_KEY') or 'test-secret-key-not-for-production'
