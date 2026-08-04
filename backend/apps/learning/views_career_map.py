"""
The career map: which jobs each CCIS program leads to, and which of them have a
learning path yet.

One request returns the whole tree. It is a browse-and-orient screen, not a feed:
33 roles is a few kilobytes, and paginating a tree would mean the middle level
arriving in pieces.
"""
from collections import OrderedDict

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CareerRole

PROGRAM_LABELS = OrderedDict([
    ('bscs', 'BS Computer Science'),
    ('bsit', 'BS Information Technology'),
    ('bsis', 'BS Information Systems'),
])


class CareerMapView(APIView):
    """GET /api/learning/career-map/ — program → category → roles."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = (
            CareerRole.objects.filter(is_active=True)
            # The path is read for every role (its id, name and slug drive the
            # card's link), so without this it is one query per role.
            .select_related('career_path')
            .order_by('program_type', 'category', 'order', 'name')
        )

        # Grouped in Python rather than with three queries: the whole set is
        # already loaded, ordered the way the tree renders.
        programs = OrderedDict(
            (key, {'key': key, 'label': label, 'categories': OrderedDict()})
            for key, label in PROGRAM_LABELS.items()
        )

        for role in roles:
            program = programs.get(role.program_type)
            if program is None:
                # 'general' roles have no column in the tree; skip rather than
                # inventing a fourth program.
                continue
            category = program['categories'].setdefault(
                role.category, {'name': role.category, 'roles': []},
            )
            path = role.career_path
            category['roles'].append({
                'id': str(role.id),
                'slug': role.slug,
                'name': role.name,
                'summary': role.summary,
                'core_skills': role.core_skills,
                'demand': role.demand,
                # null means "no path seeded yet", which the card renders as
                # "path coming soon" rather than a dead link.
                'path': None if path is None else {
                    'id': str(path.id),
                    'name': path.name,
                    'slug': path.slug,
                    'total_modules': path.total_modules,
                },
            })

        payload = []
        for program in programs.values():
            categories = list(program['categories'].values())
            role_count = sum(len(c['roles']) for c in categories)
            payload.append({
                'key': program['key'],
                'label': program['label'],
                'role_count': role_count,
                'with_path': sum(
                    1 for c in categories for r in c['roles'] if r['path'] is not None
                ),
                'categories': categories,
            })

        return Response({'programs': payload})
