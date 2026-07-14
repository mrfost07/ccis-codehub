"""
Migration: Add AchievedSkill model, skills_taught to LearningModule,
and skills_granted to CareerPath.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0015_add_show_results_quiz'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add skills_taught JSONField to LearningModule
        migrations.AddField(
            model_name='learningmodule',
            name='skills_taught',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Skills taught in this module. Format: [{"name": "Python", "category": "Programming Language", "level": "beginner"}]'
            ),
        ),
        # Add skills_granted JSONField to CareerPath
        migrations.AddField(
            model_name='careerpath',
            name='skills_granted',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of skills granted on path completion. Format: [{"name": "Python", "category": "Programming Language", "level": "intermediate"}]'
            ),
        ),
        # Create AchievedSkill model
        migrations.CreateModel(
            name='AchievedSkill',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('source_type', models.CharField(
                    choices=[
                        ('module', 'Learning Module'),
                        ('path', 'Career Path'),
                        ('challenge', 'Coding Challenge'),
                        ('video', 'Video Course'),
                        ('quiz', 'Quiz'),
                    ],
                    db_index=True,
                    max_length=20
                )),
                ('source_id', models.CharField(max_length=100)),
                ('source_name', models.CharField(max_length=200)),
                ('skill_name', models.CharField(db_index=True, max_length=100)),
                ('skill_category', models.CharField(default='General', max_length=50)),
                ('proficiency_level', models.CharField(
                    choices=[
                        ('beginner', 'Beginner'),
                        ('intermediate', 'Intermediate'),
                        ('advanced', 'Advanced'),
                    ],
                    default='beginner',
                    max_length=20
                )),
                ('earned_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('is_verified', models.BooleanField(default=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='achieved_skills',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-earned_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='achievedskill',
            constraint=models.UniqueConstraint(
                fields=['user', 'skill_name', 'source_type', 'source_id'],
                name='unique_skill_per_source'
            ),
        ),
    ]
