from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0019_leaderboard_snapshot'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='JobCache',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('external_id', models.CharField(db_index=True, max_length=255, unique=True)),
                ('title', models.CharField(max_length=300)),
                ('company', models.CharField(max_length=200)),
                ('location', models.CharField(blank=True, max_length=200)),
                ('job_type', models.CharField(blank=True, choices=[('fulltime', 'Full-time'), ('parttime', 'Part-time'), ('internship', 'Internship'), ('contract', 'Contract'), ('remote', 'Remote')], max_length=20)),
                ('salary_min', models.IntegerField(blank=True, null=True)),
                ('salary_max', models.IntegerField(blank=True, null=True)),
                ('salary_currency', models.CharField(default='PHP', max_length=5)),
                ('description', models.TextField(blank=True)),
                ('apply_url', models.URLField(max_length=1000)),
                ('company_logo', models.URLField(blank=True, max_length=1000)),
                ('skills_required', models.JSONField(default=list)),
                ('posted_at', models.DateTimeField(blank=True, null=True)),
                ('cached_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('source', models.CharField(default='jsearch', max_length=30)),
            ],
            options={
                'ordering': ['-posted_at', '-cached_at'],
            },
        ),
        migrations.CreateModel(
            name='SavedJob',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('saved_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saves', to='learning.jobcache')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saved_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-saved_at'],
                'unique_together': {('user', 'job')},
            },
        ),
        migrations.AddIndex(
            model_name='jobcache',
            index=models.Index(fields=['is_active', '-posted_at'], name='learning_jo_is_acti_idx'),
        ),
    ]
