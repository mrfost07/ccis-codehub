"""
Shared queryset shaping for the projects app.

ProjectSerializer embeds memberships and tasks and derives five more fields
from them, so an unshaped queryset costs several queries per project. The
viewset was fixed for its own list route, but the same serializer is also used
from TeamDetailSerializer.get_projects and TeamViewSet.projects, and those kept
the per-row cost — team detail measured 14 queries.

That is the same failure that left the admin Learning page at 63 queries after
the public one dropped to 4: one call site optimised, the others forgotten.
Keeping the shape in one function is the only thing that reliably prevents it.
"""
from django.db.models import Prefetch


def shaped_projects(base=None):
    """Project queryset with everything ProjectSerializer reads."""
    from .models import Project

    qs = Project.objects.all() if base is None else base
    return qs.select_related(
        'owner', 'team', 'team__leader',
    ).prefetch_related(
        'memberships__user',
        'tasks__assigned_to',
        'tasks__created_by',
        'tasks__project__team__leader',
        'team__memberships__user',
        # TeamMembershipSerializer exposes invited_by.username
        'team__memberships__invited_by',
    )
