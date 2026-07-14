from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0010_add_quiz_scheduling'),
    ]

    operations = [
        migrations.AddField(
            model_name='livequiz',
            name='fullscreen_exit_action',
            field=models.CharField(
                choices=[('warn', 'Warn Only'), ('pause', 'Pause Quiz'), ('close', 'Close Session')],
                default='warn',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='livequiz',
            name='alt_tab_action',
            field=models.CharField(
                choices=[('warn', 'Warn Only'), ('shuffle', 'Shuffle Question'), ('close', 'Close Session')],
                default='warn',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='livequiz',
            name='enable_ai_proctor',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='livequiz',
            name='enable_code_execution',
            field=models.BooleanField(default=True),
        ),
    ]
