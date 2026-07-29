"""
Measure query count and wall-clock per API endpoint against the REAL database.

This is the counterpart to apps/core/test_query_counts.py. Those tests pin
query COUNTS on in-memory SQLite, because a count is backend-independent and a
suite that talks to Neon would both take minutes and create a throwaway
database on the production instance. What a count cannot tell you is how long
anything actually takes — latency is count x round-trip, and the round-trip
belongs to wherever the database lives. That is what this command measures:

    python manage.py measure_queries                  # list routes, all roles
    python manage.py measure_queries --threshold 0    # show everything
    python manage.py measure_queries --detail         # include /<id>/ routes
    python manage.py measure_queries --role student

It runs against whatever DATABASE_URL is configured, so by default that is
Neon — the numbers include real network latency. It issues GET requests only.

Note on --detail: a few GET handlers legitimately write (retrieving a post
increments its view_count), so detail routes are opt-in rather than default.
"""
import re
import time

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import get_resolver

# Endpoints that kick off external work or bulk mutations. Skipped even though
# this only sends GETs, because several are GET+POST actions.
SKIP = (
    'sync', 'extract', 'generate', 'mark_all', 'check_and_award', 'captcha',
    'google', 'token/refresh', 'schema', 'swagger', 'redoc',
)
ARG = re.compile(r'\(\?P<(\w+)>[^)]*\)|<[^:>]*:?(\w+)>')


class Command(BaseCommand):
    help = 'Measure per-endpoint query count and elapsed time against the real database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--threshold', type=int, default=8,
            help='Only report endpoints above this query count (default: 8, 0 for all).',
        )
        parser.add_argument(
            '--role', action='append', dest='roles',
            help='Role to measure as; repeatable. Default: student, instructor, admin.',
        )
        parser.add_argument(
            '--detail', action='store_true',
            help='Also measure /<id>/ routes by substituting a real object.',
        )

    # -- endpoint discovery ------------------------------------------------

    def _walk(self, patterns, prefix=''):
        """
        Yield (url_pattern, view_class_or_None) for every /api/ route.

        Walks url_patterns rather than resolver.reverse_dict. reverse_dict is
        keyed by URL name and keeps one pattern per name, and two apps here
        register basename='badge' — so a reverse_dict-based sweep silently
        dropped /api/community/badges/ and its neighbours, and reported 77 of
        the 140 routes this project serves.

        Every route is yielded regardless of view type. Filtering to
        GenericAPIView subclasses looks reasonable and is wrong: plain APIView
        subclasses and @api_view functions are dropped by it, and those include
        /api/admin/analytics/ and /api/auth/admin/dashboard/ — two of the
        heaviest endpoints in the project. The class is only needed to resolve
        a lookup value for detail routes, so it is allowed to be None.
        """
        for pattern in patterns:
            raw = str(pattern.pattern)
            if hasattr(pattern, 'url_patterns'):
                yield from self._walk(pattern.url_patterns, prefix + raw)
                continue
            full = ('/' + prefix + raw).replace('\\.', '.').replace('$', '').replace('^', '')
            full = re.sub(r'/+', '/', full)
            if not full.startswith('/api/') or any(s in full for s in SKIP):
                continue
            callback = getattr(pattern, 'callback', None)
            cls = getattr(callback, 'cls', None) or getattr(callback, 'view_class', None)
            yield full, (cls if isinstance(cls, type) else None)

    def _resolve_arg(self, cls):
        """A real lookup value for a detail route, or None if unavailable."""
        if cls is None:
            return None
        model = None
        queryset = getattr(cls, 'queryset', None)
        if queryset is not None:
            model = queryset.model
        else:
            serializer = getattr(cls, 'serializer_class', None)
            model = getattr(getattr(serializer, 'Meta', None), 'model', None)
        if model is None:
            return None
        obj = model.objects.order_by('pk').first()
        if obj is None:
            return None
        return str(getattr(obj, getattr(cls, 'lookup_field', 'pk'), obj.pk))

    # -- entry point -------------------------------------------------------

    def handle(self, *args, **options):
        from django.test import Client
        from rest_framework_simplejwt.tokens import RefreshToken

        from apps.accounts.models import User

        engine = settings.DATABASES['default']['ENGINE']
        self.stdout.write(f'database: {engine.rsplit(".", 1)[-1]} ({connection.vendor})')
        if connection.vendor == 'sqlite':
            self.stdout.write(self.style.WARNING(
                'This is SQLite, so the timings are local and meaningless for '
                'production. Run without DJANGO_SETTINGS_MODULE=core.settings_test '
                'to measure the configured (Neon) database.'
            ))

        # django.test.Client sends Host: testserver.
        if 'testserver' not in settings.ALLOWED_HOSTS:
            settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']

        routes = []
        for url, cls in self._walk(get_resolver().url_patterns):
            arg_names = [a or b for a, b in ARG.findall(url)]
            if not arg_names:
                routes.append((url, cls))
            elif options['detail'] and len(arg_names) == 1:
                value = self._resolve_arg(cls)
                if value is not None:
                    routes.append((ARG.sub(value, url, count=1), cls))

        roles = options['roles'] or ['student', 'instructor', 'admin']
        worst = {}
        measured = skipped = 0

        for role in roles:
            user = User.objects.filter(role=role).first()
            if user is None:
                self.stdout.write(self.style.WARNING(f'no {role} user; skipping that role'))
                continue
            token = RefreshToken.for_user(user).access_token
            client = Client(HTTP_AUTHORIZATION=f'Bearer {token}')

            for url, _cls in routes:
                started = time.perf_counter()
                try:
                    with CaptureQueriesContext(connection) as captured:
                        response = client.get(url)
                    elapsed_ms = (time.perf_counter() - started) * 1000
                    count, status = len(captured.captured_queries), response.status_code
                except Exception as exc:                      # noqa: BLE001
                    self.stdout.write(self.style.ERROR(
                        f'  {url} raised {type(exc).__name__}: {exc}'
                    ))
                    skipped += 1
                    continue
                measured += 1
                if status != 200:
                    continue
                if count > worst.get(url, (0,))[0]:
                    worst[url] = (count, elapsed_ms, role)

        threshold = options['threshold']
        rows = sorted(
            ((u, c, ms, r) for u, (c, ms, r) in worst.items() if c > threshold),
            key=lambda row: -row[1],
        )
        self.stdout.write('')
        self.stdout.write(f'{"endpoint":<58}{"queries":>8}{"ms":>10}   role')
        self.stdout.write('-' * 88)
        for url, count, ms, role in rows:
            self.stdout.write(f'{url:<58}{count:>8}{ms:>10.0f}   {role}')
        if not rows:
            self.stdout.write(f'  nothing above {threshold} queries')

        totals = [c for c, _ms, _r in worst.values()]
        total_ms = sum(ms for _c, ms, _r in worst.values())
        self.stdout.write('')
        self.stdout.write(
            f'{len(worst)} endpoints returned 200 of {len(routes)} discovered '
            f'({measured} requests, {skipped} errored)'
        )
        self.stdout.write(
            f'worst-role totals: {sum(totals)} queries, {total_ms:.0f} ms, '
            f'max {max(totals) if totals else 0} queries on one endpoint'
        )
