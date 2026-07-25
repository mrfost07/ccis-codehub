"""
Grandfather existing accounts.

`email_verified` was added defaulting to False. Everyone who signed up before
email confirmation existed would otherwise be locked out of login the moment
REQUIRE_EMAIL_VERIFICATION is enabled, so mark all pre-existing users verified.
Only accounts created after this migration go through the new flow.
"""
from django.db import migrations


def mark_existing_users_verified(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(email_verified=False).update(email_verified=True)


def unmark(apps, schema_editor):
    # Intentionally a no-op: we cannot tell which users were backfilled versus
    # genuinely confirmed, and un-verifying real users would lock them out.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_user_email_verified_user_email_verified_at'),
    ]

    operations = [
        migrations.RunPython(mark_existing_users_verified, unmark),
    ]
