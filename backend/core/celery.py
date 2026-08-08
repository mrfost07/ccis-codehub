"""
Celery entry point.

The settings for this existed but the app object did not, so no task could ever
have run — `CELERY_BROKER_URL` was configured against a broker nothing was
listening to.

With no Redis configured, CELERY_TASK_ALWAYS_EAGER makes tasks run inline. That
is what keeps the test suite and local development free of a broker.
"""
import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('ccis')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
