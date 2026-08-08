"""
Filtering enrolments by career path.

The path detail page asks `/learning/enrollments/?career_path=<id>` and shows
the first row it gets back as this path's enrolment. The parameter was never
implemented, so the queryset ignored it and returned every enrolment the
student had. The page then took row zero.

The visible result on production: a student enrolled in "Fundamentals of SQL"
opened the brand-new Cloud Engineer path and was told "Enrolled on 8/5/2026" —
the SQL enrolment's date — with that path's progress bar. The enrol button is
hidden when an enrolment is present, so they could not enrol in anything new at
all.

What is pinned here is that the filter selects, and that a request which
matches nothing returns nothing rather than everything.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import CareerPath, Enrollment


@pytest.fixture
def student(db):
    return User.objects.create_user(
        username='enr_stu', email='enr@ssct.edu.ph', password='x', role='student')


@pytest.fixture
def paths(db):
    return [
        CareerPath.objects.create(
            name=name, slug=slug, description='d', program_type='bsit',
            difficulty_level='beginner', estimated_duration=4)
        for name, slug in (('Fundamentals of SQL', 'enr-sql'),
                           ('Cloud Engineer', 'enr-cloud'))
    ]


@pytest.fixture
def client(student):
    api = APIClient()
    api.force_authenticate(student)
    return api


@pytest.mark.django_db
class TestFilteringByPath:
    def test_it_returns_only_the_enrolment_for_that_path(self, client, student, paths):
        sql, cloud = paths
        Enrollment.objects.create(user=student, career_path=sql, status='active')
        Enrollment.objects.create(user=student, career_path=cloud, status='active')

        response = client.get('/api/learning/enrollments/', {'career_path': str(cloud.id)})

        rows = response.data.get('results', response.data)
        assert len(rows) == 1
        # `career_path` is the raw id — the nested object is career_path_details.
        assert str(rows[0]['career_path']) == str(cloud.id)

    def test_a_path_the_student_has_not_taken_returns_nothing(
            self, client, student, paths):
        # The exact production bug. Enrolled in one path, asking about another:
        # the answer must be empty, not the other path's enrolment.
        sql, cloud = paths
        Enrollment.objects.create(user=student, career_path=sql, status='active')

        response = client.get('/api/learning/enrollments/', {'career_path': str(cloud.id)})

        rows = response.data.get('results', response.data)
        assert rows == [] or len(rows) == 0

    def test_an_unreadable_id_matches_nothing(self, client, student, paths):
        # Returning everything on a parameter it could not parse is how the
        # page came to show another path's enrolment.
        Enrollment.objects.create(user=student, career_path=paths[0], status='active')

        response = client.get('/api/learning/enrollments/', {'career_path': 'not-a-uuid'})

        assert response.status_code == 200
        rows = response.data.get('results', response.data)
        assert len(rows) == 0

    def test_no_filter_still_lists_everything(self, client, student, paths):
        for path in paths:
            Enrollment.objects.create(user=student, career_path=path, status='active')

        response = client.get('/api/learning/enrollments/')

        rows = response.data.get('results', response.data)
        assert len(rows) == 2

    def test_it_never_reaches_another_student(self, client, student, paths):
        stranger = User.objects.create_user(
            username='enr_other', email='enro@ssct.edu.ph', password='x')
        Enrollment.objects.create(user=stranger, career_path=paths[1], status='active')

        response = client.get('/api/learning/enrollments/',
                              {'career_path': str(paths[1].id)})

        rows = response.data.get('results', response.data)
        assert len(rows) == 0
