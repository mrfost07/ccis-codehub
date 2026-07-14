"""
Backfill is_staff for existing admin-role users.

Admin authorization now checks Django's is_staff/is_superuser flags instead of
the application `role` string (remediation Req 4). Users who were promoted to
role='admin' via the dashboard did not get is_staff set, so grant it here to
preserve their access. Idempotent: re-running changes nothing.
"""
from django.db import migrations


def grant_staff_to_admins(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(role='admin', is_staff=False).update(is_staff=True)


def noop(apps, schema_editor):
    # No safe reverse: we cannot know which admins lacked is_staff before.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_appsettings'),
    ]

    operations = [
        migrations.RunPython(grant_staff_to_admins, noop),
    ]
