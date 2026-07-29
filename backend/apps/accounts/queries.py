"""
Shared queryset annotations for user-facing endpoints.

UserProfileSerializer exposes project and task counts. Computed per object they
cost six queries per user, which on a list endpoint is 6N — /api/auth/users/
was spending ~10 s over 39 queries to return 6 KB, because the database is
roughly 250 ms away and the cost is round-trips, not rows.

Annotating collapses all of it into the single list query. Kept here rather
than inline so every endpoint serving users applies exactly the same shape.
"""
from django.db.models import Count, Q

ACTIVE_PROJECT_STATUSES = ['active', 'in_progress']


def annotate_user_stats(queryset):
    """Add the counts UserProfileSerializer reads, plus the profile join."""
    return queryset.select_related('profile').annotate(
        # distinct=True is required: these are separate multi-valued joins and
        # without it each one multiplies the others' row counts.
        owned_projects_total=Count('owned_projects', distinct=True),
        member_projects_total=Count(
            'project_memberships',
            filter=Q(project_memberships__is_active=True),
            distinct=True,
        ),
        owned_active_total=Count(
            'owned_projects',
            filter=Q(owned_projects__status__in=ACTIVE_PROJECT_STATUSES),
            distinct=True,
        ),
        member_active_total=Count(
            'project_memberships',
            filter=Q(project_memberships__is_active=True)
            & Q(project_memberships__project__status__in=ACTIVE_PROJECT_STATUSES),
            distinct=True,
        ),
        tasks_done_total=Count(
            'assigned_tasks',
            filter=Q(assigned_tasks__status='done'),
            distinct=True,
        ),
    ).order_by(
        # Explicit despite User.Meta.ordering: annotate() adds a GROUP BY, and
        # QuerySet.ordered is False for grouped queries, so DRF would paginate
        # this as unordered and pages could repeat or skip users.
        '-created_at', 'id',
    )
