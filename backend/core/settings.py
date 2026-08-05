"""
Django settings for core project.
"""

import os
import sys
from pathlib import Path
from datetime import timedelta
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False)
)
# Read .env file from backend directory
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY WARNING: keep the secret key used in production secret!
# SECURITY: No default - SECRET_KEY must be set in .env or environment
SECRET_KEY = env('DJANGO_SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
# Must parse as a boolean — env('...') returns the raw string, so "False"
# would be truthy and silently keep DEBUG on (disabling the prod security block).
#
# Defaults to False. It defaulted to True, and .env_example ships DJANGO_DEBUG=True,
# so a deploy that copied the template and skipped verify.sh served tracebacks,
# SQL and settings to the internet. Both environments set this explicitly today;
# the default only decides what a MISSING value means, and that should be safe.
DEBUG = env.bool('DJANGO_DEBUG', default=False)

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '.onrender.com', '.vercel.app'])

# AI Configuration
AI_MODEL_DEFAULT = env('AI_MODEL_DEFAULT', default='openrouter')  # Changed default to openrouter
GOOGLE_GEMINI_API_KEY = env('GOOGLE_GEMINI_API_KEY', default='')
GEMINI_API_KEY = GOOGLE_GEMINI_API_KEY  # Alias for compatibility
OPENAI_API_KEY = env('OPENAI_API_KEY', default='')
OPENROUTER_API_KEY = env('OPENROUTER_API_KEY', default='')
OPENROUTER_MODEL = env('OPENROUTER_MODEL', default='google/gemini-2.0-flash-exp:free')

# GitHub API Configuration
GITHUB_ACCESS_TOKEN = env('GITHUB_ACCESS_TOKEN', default='')

# JSearch (RapidAPI) — Job Fetcher
JSEARCH_API_KEY = env('JSEARCH_API_KEY', default='')
JSEARCH_HOST    = env('JSEARCH_HOST', default='jsearch.p.rapidapi.com')

# ElevenLabs TTS — Voice Chat
ELEVENLABS_API_KEY = env('ELEVENLABS_API_KEY', default='')
ELEVENLABS_VOICE_ID = env('ELEVENLABS_VOICE_ID', default='hpp4J3VqNfWAUOO0d1Us')  # Bella
ELEVENLABS_MODEL_ID = env('ELEVENLABS_MODEL_ID', default='eleven_monolingual_v1')

# Voice (speech replies) is COMING SOON — off unless explicitly enabled AND a
# TTS key is present. ElevenLabs is paid and unprovisioned in production, so
# leaving it on produced confusing failures instead of a clear "coming soon".
ENABLE_VOICE_FEATURES = env.bool('ENABLE_VOICE_FEATURES', default=False)

# ---------------------------------------------------------------------------
# Email
#
# These were previously absent, so EMAIL_BACKEND in .env was never read and
# Django silently fell back to smtp://localhost:25 — every send raised
# ConnectionRefusedError. Default to the console backend in DEBUG so signup
# links are printed to the runserver output; production must set real SMTP.
# ---------------------------------------------------------------------------
# Public URL of the SPA. Used to build absolute links in outgoing email
# (confirmation, password reset) and as a trusted CSRF origin.
# MUST be scheme-qualified — a bare host or empty value produces a relative
# link like "/verify-email/..." which is unusable from an email client.
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000').rstrip('/')
if not FRONTEND_URL.startswith(('http://', 'https://')):
    FRONTEND_URL = f'https://{FRONTEND_URL}' if FRONTEND_URL else 'http://localhost:3000'

EMAIL_BACKEND = env(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend' if DEBUG
    else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = env('EMAIL_HOST', default='')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_USE_SSL = env.bool('EMAIL_USE_SSL', default=False)
EMAIL_TIMEOUT = env.int('EMAIL_TIMEOUT', default=10)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='CCIS CodeHub <no-reply@ccis-codehub.space>')

# Require users to confirm their email before they can sign in.
# NOTE: if this is on while email delivery is broken, nobody can complete
# signup — the registration response reports whether the mail actually went
# out, and unverified accounts can always request a new link.
REQUIRE_EMAIL_VERIFICATION = env.bool('REQUIRE_EMAIL_VERIFICATION', default=True)
EMAIL_VERIFICATION_TIMEOUT_HOURS = env.int('EMAIL_VERIFICATION_TIMEOUT_HOURS', default=48)

# Application definition

INSTALLED_APPS = [
    'daphne',  # Must be first for ASGI
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',  # Token blacklist for security
    'corsheaders',
    'channels',
    'drf_spectacular',
    
    # Local apps
    'apps.accounts',
    'apps.learning',
    'apps.community',
    'apps.projects',
    'apps.competitions',
    'apps.ai_mentor',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

# Check for DATABASE_URL first (for Neon/production)
DATABASE_URL = env('DATABASE_URL', default=None)

# USE_SQLITE=1 ignores DATABASE_URL and works against a local file.
#
# There is no Postgres-only feature anywhere in the app — no ArrayField, no
# HStore, no SearchVector — so SQLite is a faithful enough local database, and it
# is the only way to develop without a network round trip per query.
#
# Worth having because the alternative is what was configured: a local
# DATABASE_URL pointing at a remote Neon project. See the warning below.
if env.bool('USE_SQLITE', default=False):
    DATABASE_URL = None

if DATABASE_URL:
    # Parse DATABASE_URL for Neon PostgreSQL
    import dj_database_url

    # Is this a local connection pooler (PgBouncer) rather than Neon direct?
    #
    # Why it matters: opening a connection to Neon costs ~2 SECONDS from this
    # deployment — TCP, then TLS, then SCRAM channel binding, across a long
    # distance. Django cannot amortise that under ASGI, because its connection
    # registry is scoped per async task, so CONN_MAX_AGE does not actually
    # reuse anything and every request pays the full handshake before doing any
    # work. Measured on production: /api/ (no database) 0.26 s, /api/health/
    # (one SELECT 1) 2.24 s.
    #
    # Pointing at a local PgBouncer removes it: Django connects over loopback
    # in microseconds and PgBouncer keeps the expensive TLS sessions to Neon
    # warm. See deploy/setup-pgbouncer.sh.
    _is_local_pool = any(h in DATABASE_URL for h in ('@127.0.0.1', '@localhost'))

    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            # A loopback hop to PgBouncer needs no TLS; PgBouncer itself still
            # talks TLS to Neon. Forcing it here would break the local socket.
            ssl_require=not _is_local_pool,
        )
    }

    if _is_local_pool:
        # PgBouncer in transaction pooling mode hands a different server
        # connection to each transaction, so anything bound to a session — a
        # server-side cursor above all — breaks with "cursor does not exist".
        DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True

elif env('DB_NAME', default=None):
    # Use individual env vars
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME'),
            'USER': env('DB_USER', default=''),
            'PASSWORD': env('DB_PASSWORD', default=''),
            'HOST': env('DB_HOST', default='localhost'),
            'PORT': env('DB_PORT', default='5432'),
            'OPTIONS': {
                'sslmode': env('DB_SSLMODE', default='prefer'),
            },
        }
    }
else:
    # Fallback to SQLite for development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


def remote_database_warning(debug, host):
    """The text to show when DEBUG is on and the database is somewhere else, else None.

    The local .env pointed at a remote Neon project — the one kept as the
    production fallback snapshot. `runserver` against it is one thing; `migrate`,
    `flush` or a stray `loaddata` write to the only rollback copy there is.

    A warning rather than a refusal: this is how the project has been developed
    and breaking that without notice would be worse than saying it out loud. Set
    USE_SQLITE=1 to develop locally instead.

    Takes its inputs as arguments so the DEBUG=False case can be tested. Reading
    the module globals directly made the one branch that must never fire in
    production the one branch that could not be exercised.
    """
    if not debug or not host:
        return None
    if host in ('localhost', '127.0.0.1', '::1'):
        return None
    return (
        f'\n  WARNING  DEBUG=True but the database is remote: {host}\n'
        '           Writes here hit shared data, not a local copy.\n'
        '           Set USE_SQLITE=1 in backend/.env to develop against a local file.\n'
    )


_db_warning = remote_database_warning(DEBUG, DATABASES['default'].get('HOST') or '')
if _db_warning:
    import sys as _sys
    print(_db_warning, file=_sys.stderr)


# `manage.py test` runs against in-memory SQLite, never the configured database.
#
# Two reasons. Local development and production currently share one Neon
# instance, so a test run creating and dropping a database is pointed at live
# student data. And every query to Neon costs ~230 ms from here, which makes a
# suite that asserts query counts unusably slow.
#
# The subcommand is matched exactly: `'test' in sys.argv` would also fire for
# any unrelated command that happens to take an argument called test —
# `manage.py loaddata test`, `manage.py createsuperuser --username test` — and
# silently point that command at an empty throwaway database.
#
# pytest does not need this: pytest.ini sets DJANGO_SETTINGS_MODULE to
# core.settings_test, which hard-overrides DATABASES on import. This block
# covers the one remaining way to reach the real database from a test runner.
if sys.argv[1:2] == ['test']:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Uploads are written by the app user but served directly by nginx, which runs
# as a different user. Django defaults these to None, meaning the process umask
# decides — a restrictive umask silently produces unreadable files and every
# image 403s. Pin them so uploads are always readable by the web server.
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Reduced from 1 hour for security
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    # Production domains
    'https://ccis-codehub.vercel.app',
    'https://ccis-codehub-api.onrender.com',
]

# Add any additional origins from environment
CORS_ALLOWED_ORIGINS += env.list('CORS_ALLOWED_ORIGINS', default=[])

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)

# Allow all headers and methods for development
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Channels (WebSockets)
# Use InMemoryChannelLayer in development (no Redis needed).
# Set REDIS_URL in .env to switch to Redis-backed channels for production.
_REDIS_URL = env('REDIS_URL', default='')
if _REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [_REDIS_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Redis Cache — falls back to LocMemCache if no Redis configured
if _REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            }
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }


# Celery Configuration — fall back to in-memory when Redis not configured
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default=_REDIS_URL or 'memory://')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default=_REDIS_URL or 'cache+memory://')
CELERY_TASK_ALWAYS_EAGER = not bool(_REDIS_URL)  # Run tasks synchronously in dev (no Redis)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Firebase Configuration
FIREBASE_CREDENTIALS = {
    'type': 'service_account',
    'project_id': env('FIREBASE_PROJECT_ID', default=''),
    'private_key_id': env('FIREBASE_PRIVATE_KEY_ID', default=''),
    'private_key': env('FIREBASE_PRIVATE_KEY', default='').replace('\\n', '\n'),
    'client_email': env('FIREBASE_CLIENT_EMAIL', default=''),
    'client_id': env('FIREBASE_CLIENT_ID', default=''),
    'auth_uri': env('FIREBASE_AUTH_URI', default='https://accounts.google.com/o/oauth2/auth'),
    'token_uri': env('FIREBASE_TOKEN_URI', default='https://oauth2.googleapis.com/token'),
    'auth_provider_x509_cert_url': env('FIREBASE_AUTH_PROVIDER_X509_CERT_URL', default='https://www.googleapis.com/oauth2/v1/certs'),
    'client_x509_cert_url': env('FIREBASE_CLIENT_X509_CERT_URL', default=''),
}

# GitHub OAuth
GITHUB_CLIENT_ID = env('GITHUB_CLIENT_ID', default='')
GITHUB_CLIENT_SECRET = env('GITHUB_CLIENT_SECRET', default='')

# OpenAI API
OPENAI_API_KEY = env('OPENAI_API_KEY', default='')

# API Documentation (drf-spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'CodeHub API',
    'DESCRIPTION': 'API documentation for CodeHub platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# ---------------------------------------------------------------------------
# CSRF trusted origins
#
# Django 4+ requires the scheme-qualified origin for any cross-origin POST
# (including the admin login form when served over HTTPS behind a proxy).
# Derived from ALLOWED_HOSTS so it stays in sync, plus FRONTEND_URL.
# ---------------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])
if not CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [
        f'https://{host.lstrip(".")}'
        for host in ALLOWED_HOSTS
        if host not in ('localhost', '127.0.0.1', '*')
        and not host.replace('.', '').isdigit()  # skip bare IPs
    ]
if FRONTEND_URL and FRONTEND_URL not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(FRONTEND_URL)

# Security Settings (for production)
if not DEBUG:
    # Behind nginx/any reverse proxy, Django only knows the request was HTTPS
    # from the forwarded header. WITHOUT this, SECURE_SSL_REDIRECT below sees
    # every proxied request as insecure and redirects forever (ERR_TOO_MANY_
    # REDIRECTS). nginx must send: proxy_set_header X-Forwarded-Proto $scheme;
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True

    # Allow disabling the redirect when TLS is terminated in front of nginx
    # (or during initial certbot HTTP-01 setup) to avoid a redirect loop.
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SECURE_REDIRECT_EXEMPT = [r'^\.well-known/acme-challenge/']

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

    # HSTS — opt-in via env so it isn't switched on before HTTPS actually works
    # (browsers cache HSTS aggressively and it is painful to undo).
    SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=0)
    if SECURE_HSTS_SECONDS:
        SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True)
        SECURE_HSTS_PRELOAD = env.bool('SECURE_HSTS_PRELOAD', default=False)

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}


# ---------------------------------------------------------------------------
# Error tracking
# ---------------------------------------------------------------------------
# Entirely optional: with no SENTRY_DSN this block does nothing, so local and
# CI runs are unaffected and the dependency stays inert.
#
# Worth having because the failure mode this platform actually hits is silent.
# A crashed request logs to journald that nobody is reading; a frontend render
# error produces no server-side signal at all. Until now the first report of an
# outage came from a student.
SENTRY_DSN = env('SENTRY_DSN', default='')

if SENTRY_DSN:
    import logging

    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
    except ImportError:
        # Setting the DSN before `pip install -r requirements.txt` has run
        # must not take the whole site down — monitoring is not worth an
        # outage. Warn and carry on without it.
        logging.getLogger(__name__).warning(
            'SENTRY_DSN is set but sentry-sdk is not installed; error tracking '
            'is disabled. Run: pip install -r requirements.txt'
        )
        SENTRY_DSN = ''

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            # Breadcrumbs from INFO, events from ERROR — warnings alone would
            # bury the real failures on the free tier's event quota.
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        environment=env('SENTRY_ENVIRONMENT', default='production' if not DEBUG else 'development'),
        release=env('SENTRY_RELEASE', default=''),
        # Sample rather than trace everything: the free tier is 5k events/month
        # and chat polls this backend every 3s per open tab.
        traces_sample_rate=env.float('SENTRY_TRACES_SAMPLE_RATE', default=0.05),
        # Never ship request bodies or session data — submissions contain
        # student code and auth payloads contain credentials.
        send_default_pii=False,
        max_request_body_size='never',
    )
