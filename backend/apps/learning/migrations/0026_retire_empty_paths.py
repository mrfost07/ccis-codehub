"""
Phase 0 of the career-path buildout: retire two paths that were never built, and
wire the one finished path to the role it leads to.

"Frontend Developer" and "Software Enginering" (sic) are names with nothing
behind them - no modules, no enrolments - and the second one's typo prints onto
any certificate it would issue. Both are superseded by the Frontend Engineer and
Software Architect paths the buildout seeds properly.

Deactivated, not deleted, and each edit is guarded on the row still looking the
way it did when this was written. On any database where somebody has since put
content or a student on one of them, the guard fails and the migration leaves it
alone rather than quietly retiring live work.
"""
from django.db import migrations


EMPTY_PATHS = ['Frontend Developer', 'Software Enginering']


def retire_empty_paths(apps, schema_editor):
    CareerPath = apps.get_model('learning', 'CareerPath')
    CareerRole = apps.get_model('learning', 'CareerRole')
    Enrollment = apps.get_model('learning', 'Enrollment')

    for name in EMPTY_PATHS:
        for path in CareerPath.objects.filter(name=name, is_active=True):
            if path.modules.exists():
                continue
            if Enrollment.objects.filter(career_path=path).exists():
                continue
            path.is_active = False
            path.save(update_fields=['is_active'])

    # The career map shows a role's path once one exists. Data Science and
    # Machine Learning is finished - five modules, forty questions - so the
    # Data Scientist card should lead to it.
    role = CareerRole.objects.filter(
        slug='bscs-data-scientist', career_path__isnull=True).first()
    path = CareerPath.objects.filter(
        name='Data Science and Machine Learning').first()
    if role and path:
        role.career_path = path
        role.save(update_fields=['career_path'])


def unretire(apps, schema_editor):
    # Deliberately not reversed. Reactivating two empty paths and unwiring a
    # role restores nothing anyone wants back; if this has to be undone it
    # should be a considered edit, not a rollback.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0025_careerrole_and_more'),
    ]

    operations = [
        migrations.RunPython(retire_empty_paths, unretire),
    ]
