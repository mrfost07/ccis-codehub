"""
Give CareerPath an author and a publication workflow.

Hand-written rather than left as `makemigrations` produced it. That version also
swept in two unrelated pre-existing drifts — a RenameIndex on jobcache and
savedjob.id -> BigAutoField — which the owner had explicitly chosen not to
address yet. Bundling them into a feature migration would have applied a schema
change nobody reviewed, so they are left untouched and `makemigrations --check`
continues to report them exactly as before.

Existing paths are marked approved by the data migration below. The field
defaults to 'draft' so newly created paths must go through approval, but every
path that already exists is live and being studied — defaulting those to draft
would remove every course from the catalogue the moment this deploys.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def approve_existing_paths(apps, schema_editor):
    """Anything that predates the workflow is already published."""
    CareerPath = apps.get_model('learning', 'CareerPath')
    CareerPath.objects.all().update(approval_status='approved')


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0021_remove_livequiz_enable_ai_proctor'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='careerpath',
            name='instructor',
            field=models.ForeignKey(
                blank=True,
                help_text='Instructor who authored this path. Shown on the certificate.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='authored_paths',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='careerpath',
            name='approval_status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('pending', 'Pending Approval'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                db_index=True,
                default='draft',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='careerpath',
            name='approved_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_paths',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='careerpath',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(approve_existing_paths, migrations.RunPython.noop),
    ]
