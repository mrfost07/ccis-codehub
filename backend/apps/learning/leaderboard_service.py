"""
Leaderboard scoring service for CCIS-CodeHub.

Call `update_leaderboard_score(user)` after any scoring action.
It recalculates that user's LeaderboardSnapshot from scratch.

Point table:
  module completed      → 10 pts
  career path completed → 100 pts
  challenge solved      → 50 pts (first-solve per challenge, distinct)
  certificate earned    → 200 pts
  badge (common)        → 20 pts
  badge (rare)          → 50 pts
  badge (epic)          → 100 pts
  badge (legendary)     → 300 pts
"""
from __future__ import annotations
import logging
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

BADGE_RARITY_POINTS: dict[str, int] = {
    'common': 20,
    'rare': 50,
    'epic': 100,
    'legendary': 300,
}


def _period_points(user, since) -> int:
    """
    Total points a user earned across ALL scored activity types since `since`.
    Each activity is filtered by its own timestamp; a missing model/timestamp
    contributes 0 rather than raising. (Remediation Req 29.)
    """
    from .models import UserProgress, Certificate, Enrollment, UserBadge

    modules = UserProgress.objects.filter(
        user=user, is_completed=True, completed_at__gte=since
    ).count()
    paths = Enrollment.objects.filter(
        user=user, status='completed', completed_at__gte=since
    ).count()
    certs = Certificate.objects.filter(user=user, issued_at__gte=since).count()

    challenges = 0
    try:
        from .models import CodingSubmission
        challenges = (
            CodingSubmission.objects
            .filter(user=user, status='accepted', submitted_at__gte=since)
            .values('challenge').distinct().count()
        )
    except Exception:
        pass

    badge_pts = sum(
        BADGE_RARITY_POINTS.get(ub.badge.rarity, 0)
        for ub in UserBadge.objects.filter(user=user, earned_at__gte=since).select_related('badge')
    )

    return modules * 10 + paths * 100 + challenges * 50 + certs * 200 + badge_pts


def _calc_points(user) -> dict:
    """Return raw component counts and total_points for a user."""
    from .models import UserProgress, Certificate, Enrollment, UserBadge

    modules = UserProgress.objects.filter(user=user, is_completed=True).count()
    paths = Enrollment.objects.filter(user=user, status='completed').count()
    certs = Certificate.objects.filter(user=user).count()

    # Challenges — distinct first solves
    challenges = 0
    try:
        from .models import CodingSubmission
        challenges = (
            CodingSubmission.objects
            .filter(user=user, status='accepted')
            .values('challenge')
            .distinct()
            .count()
        )
    except Exception:
        pass

    # Badges — weighted by rarity
    badge_qs = UserBadge.objects.filter(user=user).select_related('badge')
    badge_pts = sum(BADGE_RARITY_POINTS.get(ub.badge.rarity, 0) for ub in badge_qs)
    badge_count = badge_qs.count()

    total = (
        modules * 10
        + paths * 100
        + challenges * 50
        + certs * 200
        + badge_pts
    )

    # Rolling window points — sum ALL scored activity types in the period, not
    # just completed modules, so weekly/monthly rankings are complete. (Req 29.)
    now = timezone.now()
    weekly = _period_points(user, now - timedelta(days=7))
    monthly = _period_points(user, now - timedelta(days=30))

    return {
        'total_points': total,
        'weekly_points': weekly,
        'monthly_points': monthly,
        'modules_completed': modules,
        'challenges_solved': challenges,
        'paths_completed': paths,
        'certificates_earned': certs,
        'badges_earned': badge_count,
    }


def update_leaderboard_score(user) -> None:
    """
    Recalculate and persist LeaderboardSnapshot for a single user.
    Non-fatal — errors are logged but never bubble up.
    """
    from .models import LeaderboardSnapshot
    try:
        data = _calc_points(user)
        entry, _ = LeaderboardSnapshot.objects.get_or_create(user=user)
        for field, value in data.items():
            setattr(entry, field, value)
        entry.save()
        logger.debug(f"[LEADERBOARD] Updated {user.username}: {data['total_points']} pts")
    except Exception as e:
        logger.warning(f"[LEADERBOARD] Failed to update {getattr(user, 'username', '?')}: {e}")


def recalculate_all() -> int:
    """Rebuild snapshots for ALL users. Used by management command."""
    from django.contrib.auth import get_user_model
    from .models import LeaderboardSnapshot

    User = get_user_model()
    users = User.objects.all()
    count = 0
    for user in users:
        try:
            data = _calc_points(user)
            entry, _ = LeaderboardSnapshot.objects.get_or_create(user=user)
            for field, value in data.items():
                setattr(entry, field, value)
            entry.save()
            count += 1
        except Exception as e:
            logger.warning(f"[LEADERBOARD] Failed for {user.username}: {e}")
    return count


def get_user_rank(user) -> dict:
    """Return rank, total users, and percentile for a given user."""
    from .models import LeaderboardSnapshot

    try:
        entry = LeaderboardSnapshot.objects.get(user=user)
    except LeaderboardSnapshot.DoesNotExist:
        update_leaderboard_score(user)
        try:
            entry = LeaderboardSnapshot.objects.get(user=user)
        except LeaderboardSnapshot.DoesNotExist:
            return {'rank': None, 'total_users': 0, 'percentile': 0, 'total_points': 0}

    rank = LeaderboardSnapshot.objects.filter(
        total_points__gt=entry.total_points
    ).count() + 1

    total = LeaderboardSnapshot.objects.count()
    percentile = round((1 - (rank / max(total, 1))) * 100)

    return {
        'rank': rank,
        'total_users': total,
        'percentile': percentile,
        'total_points': entry.total_points,
        'entry': entry,
    }
