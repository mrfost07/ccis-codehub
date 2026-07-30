"""
The one editable field on the certificate.

Hand-written for the same reason as 0022: `makemigrations` also wants to sweep
in two unrelated pre-existing drifts (a RenameIndex on jobcache and
savedjob.id -> BigAutoField) that the owner chose not to address. Those are left
untouched so this migration contains only the field it advertises.

Blank rather than a literal default so the renderer decides the wording in one
place, and changing that wording later does not require a data migration.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0022_careerpath_instructor_and_approval'),
    ]

    operations = [
        migrations.AddField(
            model_name='careerpath',
            name='certificate_title',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Heading printed on the certificate. Blank uses "Certificate of Completion".',
                max_length=120,
            ),
        ),
        migrations.AlterField(
            model_name='careerpath',
            name='certificate_template',
            field=models.FileField(
                blank=True,
                help_text='Deprecated and unused. The certificate is generated from a fixed design.',
                null=True,
                upload_to='certificates/templates/',
            ),
        ),
    ]
