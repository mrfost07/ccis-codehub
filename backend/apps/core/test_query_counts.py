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

These run against in-memory SQLite (pytest.ini points at core.settings_test),
and that is deliberate: a query COUNT is the same on every backend, so it is
what these tests can pin. Wall-clock is not — latency is count x round-trip,
and the round-trip belongs to wherever the database lives. Pointing the suite
at Neon would also create and drop a test database on the production instance.
To measure real latency against Neon, use the read-only sweep:

    python manage.py measure_queries

The file must stay named test_*.py: pytest.ini sets
`python_files = tests.py test_*.py *_tests.py`, and an earlier name of
tests_query_counts.py matched none of them, so every guard here was silently
uncollected by `pytest apps` for its first day of existence.

    pytest apps/core/test_query_counts.py -q
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

    def test_team_detail_nested_projects(self):
        """
        Team detail nests up to five fully-serialised projects.

        Shaping this costs one extra query at a single project (prefetch has a
        fixed overhead), so it only pays off if the count then stays flat as
        projects are added. That is exactly what this asserts — measured on
        production data alone the change looked like a regression.
        """
        from apps.projects.models import Team
        team = Team.objects.create(name='QC Team', slug='qc-team', leader=self.admin)

        def add_projects(n, offset=0):
            from apps.projects.models import Project, ProjectTask
            for i in range(offset, offset + n):
                p = Project.objects.create(
                    name=f'TP {i}', slug=f'tp-{i}', description='d',
                    owner=self.admin, team=team, status='active', visibility='public',
                )
                ProjectTask.objects.create(
                    project=p, title=f'TT{i}', status='todo', created_by=self.admin,
                )

        self.assert_invariant(
            f'/api/projects/teams/{team.slug}/',
            lambda: add_projects(1),
            lambda: add_projects(3, offset=1),
        )

    def test_team_projects_action(self):
        from apps.projects.models import Team
        team = Team.objects.create(name='QC Team2', slug='qc-team2', leader=self.admin)

        def add_projects(n, offset=0):
            from apps.projects.models import Project, ProjectTask
            for i in range(offset, offset + n):
                p = Project.objects.create(
                    name=f'TQ {i}', slug=f'tq-{i}', description='d',
                    owner=self.admin, team=team, status='active', visibility='public',
                )
                ProjectTask.objects.create(
                    project=p, title=f'TU{i}', status='todo', created_by=self.admin,
                )

        self.assert_invariant(
            f'/api/projects/teams/{team.slug}/projects/',
            lambda: add_projects(1),
            lambda: add_projects(3, offset=1),
        )

    # -- detail routes and custom actions ----------------------------------
    #
    # None of these were ever measured: the endpoint sweeps skipped any URL
    # taking an argument, so /<id>/ routes and detail actions were invisible.
    # live-quiz final_overview was at 108 queries, the highest in the codebase.

    def test_project_progress_action(self):
        """Invariant to both task count and team size — it looped over each."""
        project = Project.objects.create(
            name='Prog', slug='prog', description='d',
            owner=self.admin, status='active', visibility='public',
        )

        def add_work(n, offset=0):
            from apps.projects.models import ProjectActivity, ProjectMembership
            for i in range(offset, offset + n):
                member = User.objects.create_user(
                    username=f'qc_m{i}', email=f'qc_m{i}@ssct.edu.ph',
                    password='x', role='student',
                )
                ProjectMembership.objects.create(
                    project=project, user=member, role='developer', is_active=True,
                )
                ProjectTask.objects.create(
                    project=project, title=f'PT{i}', status='done',
                    priority='high', created_by=self.admin, assigned_to=member,
                )
                ProjectActivity.objects.create(
                    project=project, user=member, activity_type='task_created',
                    description='d',
                )

        self.assert_invariant(
            f'/api/projects/projects/{project.slug}/progress/',
            lambda: add_work(1),
            lambda: add_work(3, offset=1),
        )

    def test_project_activities_action(self):
        project = Project.objects.create(
            name='Acts', slug='acts', description='d',
            owner=self.admin, status='active', visibility='public',
        )

        def add_activities(n, offset=0):
            from apps.projects.models import ProjectActivity
            for i in range(offset, offset + n):
                ProjectActivity.objects.create(
                    project=project, user=self.admin,
                    activity_type='task_created', description=f'a{i}',
                )

        self.assert_invariant(
            f'/api/projects/projects/{project.slug}/activities/',
            lambda: add_activities(2),
            lambda: add_activities(4, offset=2),
        )

    def test_live_quiz_final_overview(self):
        """
        Invariant to question count: this ran four queries per question, so a
        25-question quiz cost ~100 round-trips.
        """
        from apps.learning.models import (
            LiveQuiz, LiveQuizParticipant, LiveQuizQuestion, LiveQuizResponse,
            LiveQuizSession,
        )

        quiz = LiveQuiz.objects.create(
            title='QC Quiz', instructor=self.admin, join_code='QC1234',
        )
        session = LiveQuizSession.objects.create(quiz=quiz)
        participant = LiveQuizParticipant.objects.create(
            session=session, student=self.admin, nickname='qc',
            total_score=1, total_correct=1, total_attempted=1,
        )

        def add_questions(n, offset=0):
            for i in range(offset, offset + n):
                question = LiveQuizQuestion.objects.create(
                    quiz=quiz, question_text=f'q{i}', question_type='multiple_choice',
                    correct_answer='A', points=1, order=i,
                )
                LiveQuizResponse.objects.create(
                    participant=participant, question=question,
                    answer_text='A', is_correct=True, response_time_seconds=1,
                )

        self.assert_invariant(
            f'/api/learning/live-quiz/{quiz.id}/final_overview/',
            lambda: add_questions(2),
            lambda: add_questions(4, offset=2),
        )

    def test_organization_members_action(self):
        """The nested organization repeated its own membership lookups per row."""
        from apps.community.models import Organization, OrganizationMembership

        org = Organization.objects.create(
            name='Members Org', slug='members-org', description='d',
            org_type='club', program='ALL', created_by=self.admin,
        )
        OrganizationMembership.objects.create(
            organization=org, user=self.admin, role='owner', status='active',
        )

        def add_members(n, offset=0):
            for i in range(offset, offset + n):
                member = User.objects.create_user(
                    username=f'qc_om{i}', email=f'qc_om{i}@ssct.edu.ph',
                    password='x', role='student',
                )
                OrganizationMembership.objects.create(
                    organization=org, user=member, role='member', status='active',
                )

        self.assert_invariant(
            f'/api/community/organizations/{org.slug}/members/',
            lambda: add_members(2),
            lambda: add_members(4, offset=2),
        )

    @staticmethod
    def _add_users(n, offset=0):
        for i in range(offset, offset + n):
            u = User.objects.create_user(
                username=f'qc_u{i}', email=f'qc_u{i}@ssct.edu.ph',
                password='x', role='student',
            )
            UserProfile.objects.create(user=u)

    def test_users_list(self):
        self.assert_invariant(
            '/api/auth/users/',
            lambda: self._add_users(2),
            lambda: self._add_users(4, offset=2),
        )

    # -- community ---------------------------------------------------------
    #
    # This whole app went unmeasured for a while: endpoints were discovered
    # from resolver.reverse_dict, which keeps one pattern per URL name, and two
    # apps register basename='badge' — so /api/community/badges/ and its
    # neighbours were silently dropped from every sweep. Organizations were at
    # 27 queries, chat messages at 22, suggested_users at two queries per
    # candidate with the candidate list capped at 100.

    def test_organizations_list(self):
        from apps.community.models import Organization, OrganizationMembership

        def add_orgs(n, offset=0):
            for i in range(offset, offset + n):
                org = Organization.objects.create(
                    name=f'Org {i}', slug=f'org-{i}', description='d',
                    org_type='club', program='ALL', created_by=self.admin,
                )
                OrganizationMembership.objects.create(
                    organization=org, user=self.admin, role='owner', status='active',
                )

        self.assert_invariant(
            '/api/community/organizations/',
            lambda: add_orgs(2),
            lambda: add_orgs(4, offset=2),
        )

    def test_comments_list(self):
        from apps.community.models import Comment, CommentLike, Post

        post = Post.objects.create(
            author=self.admin, content='c', post_type='discussion',
        )

        def add_comments(n, offset=0):
            for i in range(offset, offset + n):
                parent = Comment.objects.create(
                    post=post, author=self.admin, content=f'c{i}',
                )
                CommentLike.objects.create(comment=parent, user=self.admin)
                # A reply, because replies are serialised by the same
                # serializer and the per-row like lookup just moves one level
                # down if only the top level is prefetched.
                Comment.objects.create(
                    post=post, author=self.admin, parent=parent, content=f'r{i}',
                )

        self.assert_invariant(
            f'/api/community/comments/?post={post.id}',
            lambda: add_comments(2),
            lambda: add_comments(4, offset=2),
        )

    def test_chat_messages_list(self):
        from apps.community.models import (
            ChatMessage, ChatNickname, ChatRoom, MessageReaction,
        )

        room = ChatRoom.objects.create(name='QC Room', room_type='GLOBAL')
        # A nickname on the sender: the serializer reads it through a reverse
        # one-to-one, which was one query per message.
        ChatNickname.objects.create(user=self.admin, nickname='qc')

        def add_messages(n, offset=0):
            for i in range(offset, offset + n):
                msg = ChatMessage.objects.create(
                    room=room, sender=self.admin, content=f'm{i}',
                )
                MessageReaction.objects.create(
                    message=msg, user=self.admin, reaction='+1',
                )

        self.assert_invariant(
            f'/api/community/chat/messages/?room={room.id}',
            lambda: add_messages(2),
            lambda: add_messages(4, offset=2),
        )

    def _make_posts(self, n, offset=0, organization=None):
        from apps.community.models import Post, PostLike
        for i in range(offset, offset + n):
            post = Post.objects.create(
                author=self.admin, content=f'p{i}', post_type='discussion',
                organization=organization,
            )
            PostLike.objects.create(post=post, user=self.admin)

    def test_posts_list(self):
        self.assert_invariant(
            '/api/community/posts/',
            lambda: self._make_posts(2),
            lambda: self._make_posts(4, offset=2),
        )

    def test_posts_organization_feed(self):
        """
        Same serializer as the list route, different queryset.

        is_liked prefers a queryset annotation and falls back to a per-post
        query when it is absent. The list route annotated; this action built
        its own queryset and did not, so the feed for an organization page paid
        one query per post while /posts/ measured clean.
        """
        from apps.community.models import Organization

        org = Organization.objects.create(
            name='Feed Org', slug='feed-org', description='d',
            org_type='club', program='ALL', created_by=self.admin,
        )
        url = f'/api/community/posts/organization_feed/?org_id={org.id}'
        self.assert_invariant(
            url,
            lambda: self._make_posts(2, organization=org),
            lambda: self._make_posts(4, offset=2, organization=org),
        )

    def test_suggested_users(self):
        """
        Cost must not scale with the number of candidate users.

        This one is not a list endpoint — it is an action that loops over up to
        100 users and ran two queries inside the loop, so it was the worst
        scaling offender found and the least visible.
        """
        self.assert_invariant(
            '/api/community/follows/suggested_users/',
            lambda: self._add_users(2, offset=100),
            lambda: self._add_users(4, offset=102),
        )

    def test_users_list_as_non_admin(self):
        """
        Non-admins get PublicUserSerializer from this endpoint, not
        UserSerializer, so it is a genuinely different code path.

        It had its own per-user counts and stayed at 15 queries long after the
        admin path dropped to 3 — the admin-only test above reported healthy
        the whole time. Any endpoint whose serializer varies by role needs
        covering per role.
        """
        student = User.objects.create_user(
            username='qc_student', email='qc_student@ssct.edu.ph',
            password='x', role='student',
        )
        UserProfile.objects.create(user=student)
        self.client.force_authenticate(user=student)

        self.assert_invariant(
            '/api/auth/users/',
            lambda: self._add_users(2),
            lambda: self._add_users(4, offset=2),
        )
