"""
Drop eight UserProfile counters that nothing ever wrote.

They were read and displayed, which is how they did damage: `total_posts` put
"0 Posts" on a profile directly above a card reading "2 likes across 1 post",
and `total_courses_completed` told a student with two finished paths and two
certificates that they had completed nothing.

Verified empty before dropping — max and sum were 0 across every profile on
production, so no information is lost. Reversing this migration restores the
columns at their default of 0, which is exactly what they held.

`total_modules_completed` and `certificates_earned` are kept: those are written
on some code paths and hold real values.

Every figure they were used for is computed from the source tables by
apps/accounts/profile_overview.py, and frontend/src/pages/profileCounters.test.ts
fails if a page starts reading a stored counter again.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_backfill_email_verified"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="userprofile",
            name="contribution_points",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="current_streak",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="longest_streak",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="total_comments",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="total_courses_completed",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="total_likes_received",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="total_posts",
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="total_projects",
        ),
    ]
