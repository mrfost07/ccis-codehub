"""
The numbers behind the profile's challenge progress and heatmap.

These are the figures a student will screenshot and compare with a friend, so
being roughly right is not good enough. The things that go wrong:

  Counting submissions instead of challenges. Solving one problem after eight
  failed attempts is one solved, not nine.

  Losing the denominator. "12 solved" means nothing; 12 of 160 does.

  A streak that breaks every morning. If today has no activity yet, the streak
  should still count back from yesterday — otherwise it reads zero from midnight
  until the student works, which is exactly when they look at it.
"""
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.challenge_progress import challenge_progress
from apps.learning.models import CodingChallenge, CodingSubmission


@pytest.fixture
def student(db):
    return User.objects.create_user(
        username='prog_stu', email='p@ssct.edu.ph', password='x', role='student')


@pytest.fixture
def challenges(db):
    made = {}
    for difficulty, count in (('easy', 3), ('medium', 2), ('hard', 1)):
        for i in range(count):
            slug = f'{difficulty}-{i}'
            made[slug] = CodingChallenge.objects.create(
                title=slug, slug=slug, description='d', difficulty=difficulty,
                supported_languages=['python'], starter_code={}, solution_code={},
                test_cases=[{'input': '1', 'expected_output': '1'}], points=10)
    return made


def submit(student, challenge, *, status='accepted', days_ago=0, points=10):
    submission = CodingSubmission.objects.create(
        user=student, challenge=challenge, language='python', code='x',
        status=status, points_earned=points if status == 'accepted' else 0)
    if days_ago:
        when = timezone.now() - timedelta(days=days_ago)
        CodingSubmission.objects.filter(pk=submission.pk).update(submitted_at=when)
    return submission


@pytest.mark.django_db
class TestCounting:
    def test_solving_one_challenge_many_times_counts_once(self, student, challenges):
        # Eight failures and a success is one solved, not nine.
        for _ in range(8):
            submit(student, challenges['easy-0'], status='wrong_answer')
        submit(student, challenges['easy-0'])

        progress = challenge_progress(student)

        assert progress['solved']['easy'] == 1
        assert progress['solved']['total'] == 1
        assert progress['submissions']['total'] == 9

    def test_solved_is_split_by_difficulty(self, student, challenges):
        submit(student, challenges['easy-0'])
        submit(student, challenges['easy-1'])
        submit(student, challenges['medium-0'])

        progress = challenge_progress(student)

        assert progress['solved'] == {'easy': 2, 'medium': 1, 'hard': 0, 'total': 3}

    def test_the_denominator_is_reported(self, student, challenges):
        # "12 solved" means nothing without it.
        progress = challenge_progress(student)

        assert progress['available'] == {'easy': 3, 'medium': 2, 'hard': 1, 'total': 6}

    def test_inactive_challenges_are_not_in_the_denominator(self, student, challenges):
        CodingChallenge.objects.filter(slug='easy-0').update(is_active=False)

        progress = challenge_progress(student)

        assert progress['available']['easy'] == 2

    def test_acceptance_rate_and_points(self, student, challenges):
        submit(student, challenges['easy-0'], points=10)
        submit(student, challenges['easy-1'], status='wrong_answer')
        submit(student, challenges['medium-0'], status='error')
        submit(student, challenges['medium-1'], points=20)

        progress = challenge_progress(student)

        assert progress['submissions'] == {
            'total': 4, 'accepted': 2, 'acceptance_rate': 50.0}
        assert progress['points'] == 30

    def test_a_student_with_nothing_gets_zeroes_not_an_error(self, student, challenges):
        progress = challenge_progress(student)

        assert progress['solved']['total'] == 0
        assert progress['submissions']['acceptance_rate'] == 0.0
        assert progress['streak'] == {'current': 0, 'longest': 0}
        assert progress['activity'] == []

    def test_another_students_work_is_not_counted(self, student, challenges):
        other = User.objects.create_user(
            username='other_stu', email='o@ssct.edu.ph', password='x', role='student')
        submit(other, challenges['easy-0'])

        assert challenge_progress(student)['solved']['total'] == 0


@pytest.mark.django_db
class TestTheHeatmap:
    def test_activity_is_grouped_by_day(self, student, challenges):
        submit(student, challenges['easy-0'], days_ago=2)
        submit(student, challenges['easy-1'], days_ago=2, status='wrong_answer')
        submit(student, challenges['medium-0'], days_ago=5)

        activity = challenge_progress(student)['activity']

        assert len(activity) == 2
        by_date = {a['date']: a for a in activity}
        two_days_ago = (timezone.localdate() - timedelta(days=2)).isoformat()
        assert by_date[two_days_ago]['count'] == 2
        assert by_date[two_days_ago]['solved'] == 1

    def test_empty_days_are_left_out(self, student, challenges):
        # A year is 365 entries and most are empty; sending them says nothing
        # and triples the payload. The client fills the grid.
        submit(student, challenges['easy-0'])

        assert len(challenge_progress(student)['activity']) == 1

    def test_activity_older_than_the_window_is_excluded(self, student, challenges):
        submit(student, challenges['easy-0'], days_ago=400)
        submit(student, challenges['easy-1'], days_ago=10)

        assert len(challenge_progress(student)['activity']) == 1

    def test_activity_comes_back_in_order(self, student, challenges):
        submit(student, challenges['easy-0'], days_ago=1)
        submit(student, challenges['easy-1'], days_ago=9)
        submit(student, challenges['medium-0'], days_ago=5)

        dates = [a['date'] for a in challenge_progress(student)['activity']]

        assert dates == sorted(dates)


@pytest.mark.django_db
class TestStreaks:
    def test_consecutive_days_build_a_streak(self, student, challenges):
        for days_ago in (0, 1, 2):
            submit(student, challenges['easy-0'], days_ago=days_ago)

        assert challenge_progress(student)['streak']['current'] == 3

    def test_a_gap_ends_the_streak(self, student, challenges):
        for days_ago in (0, 1, 3, 4, 5):
            submit(student, challenges['easy-0'], days_ago=days_ago)

        progress = challenge_progress(student)

        assert progress['streak']['current'] == 2
        assert progress['streak']['longest'] == 3

    def test_nothing_today_still_counts_yesterday(self, student, challenges):
        # Otherwise the streak reads zero from midnight until the student
        # works, which is exactly when they look at it.
        for days_ago in (1, 2, 3):
            submit(student, challenges['easy-0'], days_ago=days_ago)

        assert challenge_progress(student)['streak']['current'] == 3

    def test_a_two_day_gap_does_end_it(self, student, challenges):
        for days_ago in (2, 3, 4):
            submit(student, challenges['easy-0'], days_ago=days_ago)

        assert challenge_progress(student)['streak']['current'] == 0

    def test_failing_all_day_still_counts_as_a_day_worked(self, student, challenges):
        submit(student, challenges['hard-0'], status='wrong_answer', days_ago=0)
        submit(student, challenges['hard-0'], status='wrong_answer', days_ago=1)

        assert challenge_progress(student)['streak']['current'] == 2

    def test_longest_survives_the_current_streak_being_short(self, student, challenges):
        for days_ago in (10, 11, 12, 13, 14):
            submit(student, challenges['easy-0'], days_ago=days_ago)
        submit(student, challenges['easy-1'], days_ago=0)

        progress = challenge_progress(student)

        assert progress['streak']['current'] == 1
        assert progress['streak']['longest'] == 5


@pytest.mark.django_db
class TestTheEndpoint:
    def test_it_returns_the_signed_in_student_s_progress(self, student, challenges):
        submit(student, challenges['easy-0'])
        client = APIClient()
        client.force_authenticate(student)

        response = client.get('/api/learning/challenges/progress/')

        assert response.status_code == 200
        assert response.data['solved']['easy'] == 1
        assert response.data['available']['total'] == 6

    def test_it_needs_a_signed_in_user(self, challenges):
        assert APIClient().get(
            '/api/learning/challenges/progress/').status_code in (401, 403)

    def test_it_does_not_grow_a_query_per_day_of_history(
            self, student, challenges, django_assert_max_num_queries):
        # The heatmap is a year wide; one query per day would be 365.
        for days_ago in range(40):
            submit(student, challenges['easy-0'], days_ago=days_ago)
        client = APIClient()
        client.force_authenticate(student)

        with django_assert_max_num_queries(8):
            client.get('/api/learning/challenges/progress/')


@pytest.mark.django_db
class TestViewingSomebodyElse:
    """`?user=<id>`, for the coding panel on a public profile."""

    @pytest.fixture
    def viewer(self, db):
        return User.objects.create_user(
            username='cp_viewer', email='cpv@ssct.edu.ph', password='x')

    def test_it_returns_that_student_s_progress(self, student, viewer, challenges):
        submit(student, challenges['easy-0'])
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(
            '/api/learning/challenges/progress/', {'user': str(student.id)})

        assert response.status_code == 200
        assert response.data['solved']['easy'] == 1

    def test_it_is_not_quietly_the_viewer_s_own_progress(
            self, student, viewer, challenges):
        # The failure that would look fine: ignoring the parameter and
        # answering for request.user, so every profile shows the viewer.
        submit(student, challenges['easy-0'])
        submit(viewer, challenges['hard-0'])
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(
            '/api/learning/challenges/progress/', {'user': str(student.id)})

        assert response.data['solved']['easy'] == 1
        assert response.data['solved']['hard'] == 0

    def test_no_parameter_still_means_your_own(self, student, viewer, challenges):
        submit(student, challenges['easy-0'])
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get('/api/learning/challenges/progress/')

        assert response.data['solved']['total'] == 0

    def test_it_needs_a_signed_in_viewer(self, student):
        assert APIClient().get(
            '/api/learning/challenges/progress/',
            {'user': str(student.id)}).status_code in (401, 403)

    def test_an_unknown_user_is_a_404(self, viewer, challenges):
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(
            '/api/learning/challenges/progress/',
            {'user': '00000000-0000-0000-0000-000000000000'})

        assert response.status_code == 404

    def test_a_malformed_id_is_a_404_rather_than_a_500(self, viewer, challenges):
        # A UUID field raises on a non-UUID string, and that exception goes
        # straight past DRF's handler into a server error.
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(
            '/api/learning/challenges/progress/', {'user': 'not-a-uuid'})

        assert response.status_code == 404

    def test_a_deactivated_account_is_not_browsable(self, student, viewer, challenges):
        submit(student, challenges['easy-0'])
        student.is_active = False
        student.save(update_fields=['is_active'])
        client = APIClient()
        client.force_authenticate(viewer)

        response = client.get(
            '/api/learning/challenges/progress/', {'user': str(student.id)})

        assert response.status_code == 404
