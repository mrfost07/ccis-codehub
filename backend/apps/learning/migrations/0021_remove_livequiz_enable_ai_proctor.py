"""
Drop LiveQuiz.enable_ai_proctor.

The server-side CV proctor (apps.ai_proctor) was removed in favour of the
in-browser exam lockdown, so this toggle is dead. (Remediation Req 17.)
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0020_job_fetcher'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='livequiz',
            name='enable_ai_proctor',
        ),
    ]
