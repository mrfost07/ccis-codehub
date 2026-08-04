"""
The career map: program → category → role, and the seam for seeding paths later.

The behaviour worth pinning is that the map is useful *before* any paths exist —
a role with no path renders as "path coming soon" rather than being hidden — and
that re-seeding the catalogue can never unwire a role from a path that has been
seeded for it.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import CareerPath, CareerRole


def _user(username, program=None):
    user = User.objects.create_user(
        email=f'{username}@ssct.edu.ph', username=username,
        password='pw12345678', role='student',
    )
    if program:
        user.program = program
        user.save(update_fields=['program'])
    return user


def _path(name='DS Path', slug='ds-path'):
    return CareerPath.objects.create(
        name=name, slug=slug, description='d', program_type='bscs',
        difficulty_level='beginner', estimated_duration=8, is_active=True,
        total_modules=5,
    )


def _role(program='bscs', name='Backend Engineer', category='Software Engineering',
          slug=None, path=None):
    return CareerRole.objects.create(
        program_type=program, category=category, name=name,
        slug=slug or f'{program}-{name.lower().replace(" ", "-")}',
        summary='Builds things.', core_skills=['Python', 'SQL'],
        career_path=path,
    )


@pytest.mark.django_db
class TestCareerMapEndpoint:
    def _client(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_requires_authentication(self):
        assert APIClient().get('/api/learning/career-map/').status_code in (401, 403)

    def test_returns_the_three_programs_even_when_empty(self):
        # A student on a program with no roles yet must still see the map's shape
        # rather than a blank page.
        resp = self._client(_user('cm_empty')).get('/api/learning/career-map/')

        assert resp.status_code == 200, resp.data
        assert [p['key'] for p in resp.data['programs']] == ['bscs', 'bsit', 'bsis']

    def test_groups_roles_under_their_category(self):
        _role(name='Backend Engineer', category='Software Engineering')
        _role(name='Data Scientist', category='Data and AI')
        _role(name='Frontend Engineer', category='Software Engineering')

        resp = self._client(_user('cm_group')).get('/api/learning/career-map/')
        bscs = next(p for p in resp.data['programs'] if p['key'] == 'bscs')

        by_name = {c['name']: [r['name'] for r in c['roles']] for c in bscs['categories']}
        assert by_name['Software Engineering'] == ['Backend Engineer', 'Frontend Engineer']
        assert by_name['Data and AI'] == ['Data Scientist']
        assert bscs['role_count'] == 3

    def test_a_role_without_a_path_is_shown_with_a_null_path(self):
        _role()
        resp = self._client(_user('cm_nopath')).get('/api/learning/career-map/')
        bscs = next(p for p in resp.data['programs'] if p['key'] == 'bscs')
        role = bscs['categories'][0]['roles'][0]

        # Not hidden: hiding unseeded roles would make the map look thin and tell
        # a student nothing about where their course leads.
        assert role['path'] is None
        assert bscs['with_path'] == 0

    def test_a_linked_role_carries_what_the_card_needs_to_navigate(self):
        path = _path()
        _role(path=path)

        resp = self._client(_user('cm_path')).get('/api/learning/career-map/')
        bscs = next(p for p in resp.data['programs'] if p['key'] == 'bscs')
        role = bscs['categories'][0]['roles'][0]

        assert role['path']['id'] == str(path.id)
        assert role['path']['name'] == path.name
        assert role['path']['total_modules'] == 5
        assert bscs['with_path'] == 1

    def test_inactive_roles_are_left_out(self):
        role = _role()
        role.is_active = False
        role.save(update_fields=['is_active'])

        resp = self._client(_user('cm_inactive')).get('/api/learning/career-map/')
        assert all(p['role_count'] == 0 for p in resp.data['programs'])

    def test_general_roles_do_not_invent_a_fourth_program(self):
        _role(program='general', name='Tech Generalist', slug='general-tech-generalist')

        resp = self._client(_user('cm_general')).get('/api/learning/career-map/')
        assert [p['key'] for p in resp.data['programs']] == ['bscs', 'bsit', 'bsis']

    def test_query_count_does_not_grow_with_the_number_of_roles(
        self, django_assert_max_num_queries,
    ):
        path = _path()
        # 80, matching the real catalogue's scale (79 roles) rather than a token
        # handful — the point is that this stays flat as the catalogue grows.
        for index in range(80):
            _role(name=f'Role {index}', slug=f'bscs-role-{index}',
                  path=path if index % 2 == 0 else None)

        client = self._client(_user('cm_perf'))
        # Every card reads its path, so without select_related this is one query
        # per role on a screen whose whole point is showing all of them at once.
        with django_assert_max_num_queries(8):
            resp = client.get('/api/learning/career-map/')
        assert resp.status_code == 200
        bscs = next(p for p in resp.data['programs'] if p['key'] == 'bscs')
        assert bscs['role_count'] == 80


@pytest.mark.django_db
class TestSeedCareerRoles:
    def _seed(self, **options):
        from django.core.management import call_command
        call_command('seed_career_roles', **options)

    def test_seeds_all_three_programs(self):
        self._seed()

        for program in ('bscs', 'bsit', 'bsis'):
            assert CareerRole.objects.filter(program_type=program, is_active=True).exists(), program
        # The catalogue is ~79 roles; a floor well below that catches a
        # truncated or half-loaded CATALOGUE without breaking on every edit.
        assert CareerRole.objects.count() > 60

    def test_running_twice_updates_rather_than_duplicating(self):
        self._seed()
        first = CareerRole.objects.count()
        self._seed()

        assert CareerRole.objects.count() == first

    def test_reseeding_does_not_unwire_a_seeded_path(self):
        self._seed()
        role = CareerRole.objects.filter(program_type='bscs').first()
        role.career_path = _path()
        role.save(update_fields=['career_path'])

        self._seed()

        role.refresh_from_db()
        # This is the whole reason career_path is absent from the command's
        # defaults: seeding content must never undo the wiring.
        assert role.career_path is not None

    def test_prune_deactivates_rather_than_deletes(self):
        stray = _role(name='Retired Role', slug='bscs-retired-role')
        self._seed(prune=True)

        stray.refresh_from_db()
        # Deactivated, never deleted: a CareerPath may point at it, and hiding a
        # card is reversible while losing the row is not.
        assert stray.is_active is False
        assert CareerRole.objects.filter(pk=stray.pk).exists()
