"""
Regression guard against N+1 queries on the list endpoints.

Every endpoint here was measured at 20-70 queries at some point, and each one
was fixed by hand. Nothing stopped the next serializer change from bringing it
back, and the symptom is invisible in development: with three rows in a table
an N+1 endpoint looks fine. It only shows up in production, where the database
is ~230 ms away and a fifty-query page takes eleven seconds.

The assertion is deliberately NOT "this endpoint takes exactly N queries".
Such a number drifts with every legitimate change and gets bumped until it
means nothing. Instead each test runs the endpoint against a small dataset and
again against a larger one, and requires the query count to be IDENTICAL.

That is the actual definition of the bug: cost that scales with row count.
A test written this way cannot be silenced by adding one more legitimate
query, and cannot pass a reintroduced N+1.

    python manage.py test apps.core.tests_query_counts
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserProfile
from apps.learning.models import CareerPath, LearningModule, Quiz
from apps.projects.models import Project, ProjectTask


class QueryCountInvarianceTests(TestCase):
    """Query count must not grow with the number of rows returned."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='qc_admin', email='qc_admin@ssct.edu.ph',
            password='x', role='admin', is_staff=True,
        )
        UserProfile.objects.create(user=self.admin)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    # -- dataset helpers ---------------------------------------------------

    def _make_paths(self, n, offset=0):
        for i in range(offset, offset + n):
            path = CareerPath.objects.create(
                name=f'Path {i}', slug=f'path-{i}', description='d',
                program_type='BSIT', difficulty_level='beginner',
                estimated_duration=4, is_active=True,
            )
            for j in range(2):
                module = LearningModule.objects.create(
                    career_path=path, title=f'M{i}-{j}', description='d', order=j,
                )
                Quiz.objects.create(
                    learning_module=module, title=f'Q{i}-{j}', description='d',
                )

    def _make_projects(self, n, offset=0):
        for i in range(offset, offset + n):
            project = Project.objects.create(
                name=f'Proj {i}', slug=f'proj-{i}', description='d',
                owner=self.admin, status='active', visibility='public',
            )
            for j in range(2):
                ProjectTask.objects.create(
                    project=project, title=f'T{i}-{j}',
                    status='todo', created_by=self.admin,
                )

    def _count_queries(self, url):
        """Queries used to serve `url`, ignoring the response body."""
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, f'{url} -> {response.status_code}')
        return len(ctx.captured_queries)

    def assert_invariant(self, url, small, grow):
        """
        Serve `url` with a small dataset, then with a larger one, and require
        the same number of queries. Any difference is work being done per row.
        """
        small()
        base = self._count_queries(url)
        grow()
        after = self._count_queries(url)
        self.assertEqual(
            base, after,
            f'{url}: {base} queries with the small dataset, {after} after adding '
            f'more rows. The endpoint does work per row — look for a .count(), '
            f'.filter() or attribute access inside a serializer method, and '
            f'resolve it with select_related/prefetch_related/annotate.',
        )

    # -- endpoints ---------------------------------------------------------

    def test_career_paths_list(self):
        self.assert_invariant(
            '/api/learning/career-paths/',
            lambda: self._make_paths(2),
            lambda: self._make_paths(4, offset=2),
        )

    def test_modules_list(self):
        self.assert_invariant(
            '/api/learning/modules/',
            lambda: self._make_paths(2),
            lambda: self._make_paths(4, offset=2),
        )

    def test_admin_modules_list(self):
        # Separate viewset over the same model as the public one; it stayed at
        # 63 queries after the public endpoint was fixed precisely because
        # nothing tied them together.
        self.assert_invariant(
            '/api/learning/admin/modules/',
            lambda: self._make_paths(2),
            lambda: self._make_paths(4, offset=2),
        )

    def test_admin_career_paths_list(self):
        self.assert_invariant(
            '/api/learning/admin/career-paths/',
            lambda: self._make_paths(2),
            lambda: self._make_paths(4, offset=2),
        )

    def test_quizzes_list(self):
        self.assert_invariant(
            '/api/learning/quizzes/',
            lambda: self._make_paths(2),
            lambda: self._make_paths(4, offset=2),
        )

    def test_projects_list(self):
        self.assert_invariant(
            '/api/projects/projects/',
            lambda: self._make_projects(2),
            lambda: self._make_projects(4, offset=2),
        )

    def test_admin_projects_list(self):
        self.assert_invariant(
            '/api/admin/projects/',
            lambda: self._make_projects(2),
            lambda: self._make_projects(4, offset=2),
        )

    def test_users_list(self):
        def add_users(n, offset=0):
            for i in range(offset, offset + n):
                u = User.objects.create_user(
                    username=f'qc_u{i}', email=f'qc_u{i}@ssct.edu.ph',
                    password='x', role='student',
                )
                UserProfile.objects.create(user=u)

        self.assert_invariant(
            '/api/auth/users/',
            lambda: add_users(2),
            lambda: add_users(4, offset=2),
        )
