"""
Claim two schema changes the job tables had already drifted into.

Neither is a new decision. `SavedJob.id` follows DEFAULT_AUTO_FIELD, which moved
to BigAutoField, and the JobCache index picked up Django's generated name. The
models have said this for a while; no migration had been written for it.

Written as its own migration precisely so it is not a surprise: left alone, the
next content change to this app would have silently carried a primary-key type
change to the jobs tables along with it, and nobody reviewing that diff would
have been looking for it.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0026_retire_empty_paths"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="jobcache",
            new_name="learning_jo_is_acti_19dd79_idx",
            old_name="learning_jo_is_acti_idx",
        ),
        migrations.AlterField(
            model_name="savedjob",
            name="id",
            field=models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
            ),
        ),
    ]
