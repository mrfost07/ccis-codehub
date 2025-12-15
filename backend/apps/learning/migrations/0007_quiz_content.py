# Generated manually for quiz content field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0006_careerpath_max_modules'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='content',
            field=models.TextField(blank=True, default='', help_text='Rich text content with slides for quiz questions'),
        ),
    ]
