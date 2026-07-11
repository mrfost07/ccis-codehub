"""
Badge granting service for CCIS-CodeHub.

Call `check_and_grant_badges(user, trigger_type, current_count)` from any view
after an action that could trigger badge progress (module completion, challenge
solve, quiz perfect score, etc.).

Badge seeding:
    Run `python manage.py seed_badges` to populate BadgeDefinition rows.
    Or seed via the admin panel.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser

logger = logging.getLogger(__name__)


def check_and_grant_badges(user, trigger_type: str, current_count: int) -> list[str]:
    """
    Check if the user has earned any new badges for the given trigger.

    Args:
        user: The authenticated user instance.
        trigger_type: One of the BadgeDefinition.TRIGGERS keys.
        current_count: How many times the user has done this action (total).

    Returns:
        List of badge names newly earned (empty if none).
    """
    from .models import BadgeDefinition, UserBadge

    newly_earned: list[str] = []

    # Fetch all active badges for this trigger type that the user hasn't earned yet
    already_earned = UserBadge.objects.filter(
        user=user, badge__trigger_type=trigger_type
    ).values_list('badge_id', flat=True)

    candidates = BadgeDefinition.objects.filter(
        trigger_type=trigger_type,
        is_active=True,
        trigger_threshold__lte=current_count,
    ).exclude(id__in=already_earned)

    for badge in candidates:
        try:
            UserBadge.objects.create(
                user=user,
                badge=badge,
                context_note=f"Reached {current_count} {trigger_type.replace('_', ' ')}"
            )
            newly_earned.append(badge.name)
            logger.info(f"[BADGE] {user.username} earned '{badge.name}'")
        except Exception as e:
            logger.warning(f"[BADGE] Failed to grant '{badge.name}' to {user.username}: {e}")

    return newly_earned


def get_trigger_count(user, trigger_type: str) -> int:
    """
    Calculate the current count for a given trigger type for a user.
    Used internally and for progress checks.
    """
    from .models import UserProgress, Certificate, AchievedSkill
    from django.db.models import Count

    if trigger_type == 'modules_completed':
        return UserProgress.objects.filter(user=user, is_completed=True).count()

    elif trigger_type == 'paths_completed':
        from .models import Enrollment
        return Enrollment.objects.filter(user=user, status='completed').count()

    elif trigger_type == 'certificates_earned':
        return Certificate.objects.filter(user=user).count()

    elif trigger_type == 'challenges_solved':
        try:
            from .models import CodingSubmission
            return CodingSubmission.objects.filter(
                user=user, status='accepted'
            ).values('challenge').distinct().count()
        except Exception:
            return 0

    return 0


def grant_badges_after_module(user) -> list[str]:
    """Convenience: check module-based badges after a module is completed."""
    count = get_trigger_count(user, 'modules_completed')
    return check_and_grant_badges(user, 'modules_completed', count)


def grant_badges_after_path(user) -> list[str]:
    """Convenience: check path-completion badges after enrollment completes."""
    path_count = get_trigger_count(user, 'paths_completed')
    cert_count = get_trigger_count(user, 'certificates_earned')
    earned = []
    earned += check_and_grant_badges(user, 'paths_completed', path_count)
    earned += check_and_grant_badges(user, 'certificates_earned', cert_count)
    return earned


def grant_badges_after_challenge(user, time_seconds: int | None = None) -> list[str]:
    """Convenience: check challenge badges after a successful submission."""
    count = get_trigger_count(user, 'challenges_solved')
    earned = check_and_grant_badges(user, 'challenges_solved', count)
    # Speed badge
    if time_seconds is not None and time_seconds < 60:
        earned += check_and_grant_badges(user, 'challenges_solved_fast', 1)
    return earned


def grant_badges_after_quiz(user, score: float) -> list[str]:
    """Convenience: check quiz badges (perfect score = 100%)."""
    if score >= 100:
        return check_and_grant_badges(user, 'quiz_perfect', 1)
    return []
