"""
Leaderboard tests (Req 29): weekly/monthly points span all scored activities,
not just completed modules.
"""
import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.learning.models import (
    CareerPath, LearningModule, UserProgress, Enrollment, LeaderboardSnapshot,
)
from apps.learning.leaderboard_service import update_leaderboard_score


@pytest.mark.django_db
def test_weekly_points_include_paths_not_just_modules():
    user = User.objects.create_user(
        email='leader@ssct.edu.ph', username='leader', password='pw12345678', role='student'
    )
    path = CareerPath.objects.create(
        name='P', slug='p', description='d', program_type='bsit',
        difficulty_level='beginner', estimated_duration=4,
    )
    module = LearningModule.objects.create(
        career_path=path, title='M', description='d', module_type='text',
        difficulty_level='beginner', content='x', order=1,
    )
    now = timezone.now()
    UserProgress.objects.create(
        user=user, career_path=path, learning_module=module,
        is_completed=True, completion_percentage=100, completed_at=now,
    )
    Enrollment.objects.create(
        user=user, career_path=path, status='completed', completed_at=now,
    )

    update_leaderboard_score(user)
    snap = LeaderboardSnapshot.objects.get(user=user)

    # module (10) + completed path (100) = 110 within the week — a modules-only
    # calculation would report just 10.
    assert snap.weekly_points == 110
    assert snap.monthly_points == 110
    assert snap.total_points == 110
