"""
Who may author a coding challenge, and whether the one they authored is gradeable.

Two problems found in the same viewset:

  Authoring was open to everyone. CodingChallengeViewSet was a plain
  ModelViewSet with IsAuthenticated, so any signed-in student could create a
  challenge — and destroy() looked one up by slug and deleted it with no further
  check. Verified against production: a student POST returned 201 and the
  permission check for destroy returned True. A student could have removed every
  challenge on the platform.

  Nothing checked the challenge was gradeable. Grading compares the student's
  stdout to the instructor's expected output, so a blank expectation passes for
  any program printing nothing, and a challenge with no hidden tests can be
  passed by branching on the visible inputs.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.challenge_validation import (
    check_challenge, looks_like_a_lookup_table,
)
from apps.learning.models import CodingChallenge


def sound_challenge(**over):
    challenge = {
        'title': 'Sum Two Numbers',
        'description': 'Read two integers and print their sum.',
        'difficulty': 'easy',
        'test_cases': [
            {'input': '2\n3', 'expected_output': '5', 'is_hidden': False},
            {'input': '10\n7', 'expected_output': '17', 'is_hidden': True},
            {'input': '-4\n9', 'expected_output': '5', 'is_hidden': True},
        ],
        'solution_code': {'python': 'a=int(input())\nb=int(input())\nprint(a+b)'},
    }
    challenge.update(over)
    return challenge


@pytest.fixture
def users(db):
    return {
        'student': User.objects.create_user(
            username='ch_stu', email='chs@ssct.edu.ph', password='x', role='student'),
        'instructor': User.objects.create_user(
            username='ch_ins', email='chi@ssct.edu.ph', password='x', role='instructor'),
        'admin': User.objects.create_user(
            username='ch_adm', email='cha@ssct.edu.ph', password='x', role='admin'),
    }


@pytest.fixture
def existing(db):
    return CodingChallenge.objects.create(
        title='Existing', slug='existing', description='d', difficulty='easy',
        supported_languages=['python'], starter_code={}, solution_code={},
        test_cases=[{'input': '1', 'expected_output': '1'}])


@pytest.mark.django_db
class TestWhoMayAuthor:
    def post(self, user, payload=None):
        client = APIClient()
        client.force_authenticate(user)
        return client.post('/api/learning/challenges/',
                           payload or sound_challenge(), format='json')

    def test_a_student_cannot_create_a_challenge(self, users):
        response = self.post(users['student'])

        assert response.status_code == 403
        assert CodingChallenge.objects.count() == 0

    def test_a_student_cannot_delete_a_challenge(self, users, existing):
        # The worst of it: destroy() took a slug and deleted it outright.
        client = APIClient()
        client.force_authenticate(users['student'])

        response = client.delete('/api/learning/challenges/existing/')

        assert response.status_code == 403
        assert CodingChallenge.objects.filter(slug='existing').exists()

    def test_an_instructor_can_create_one(self, users):
        response = self.post(users['instructor'])

        assert response.status_code == 201
        assert CodingChallenge.objects.count() == 1

    def test_an_admin_can_create_one(self, users):
        assert self.post(users['admin']).status_code == 201

    def test_a_student_can_still_read_challenges(self, users, existing):
        # Gating writes must not lock students out of the exercises.
        client = APIClient()
        client.force_authenticate(users['student'])

        assert client.get('/api/learning/challenges/').status_code == 200
        assert client.get('/api/learning/challenges/existing/').status_code == 200

    def test_the_author_is_recorded(self, users):
        self.post(users['instructor'])

        assert CodingChallenge.objects.get().created_by == users['instructor']


@pytest.mark.django_db
class TestCreationIsValidated:
    def post(self, user, payload):
        client = APIClient()
        client.force_authenticate(user)
        return client.post('/api/learning/challenges/', payload, format='json')

    def test_a_challenge_with_no_tests_is_refused(self, users):
        response = self.post(users['instructor'], sound_challenge(test_cases=[]))

        assert response.status_code == 400
        assert CodingChallenge.objects.count() == 0

    def test_a_blank_expected_output_is_refused(self, users):
        # It passes for any program that prints nothing.
        response = self.post(users['instructor'], sound_challenge(test_cases=[
            {'input': '2\n3', 'expected_output': '   '}]))

        assert response.status_code == 400
        assert 'blank' in str(response.data['errors']).lower()

    def test_a_cheatable_challenge_is_created_but_flagged(self, users):
        # No hidden tests means cheatable, not broken. The author decides.
        response = self.post(users['instructor'], sound_challenge(test_cases=[
            {'input': '2\n3', 'expected_output': '5', 'is_hidden': False}]))

        assert response.status_code == 201
        assert any('hidden' in w for w in response.data['warnings'])

    def test_a_sound_challenge_has_nothing_to_warn_about(self, users):
        response = self.post(users['instructor'], sound_challenge())

        assert response.status_code == 201
        assert response.data['warnings'] == []


class TestCheckingAChallenge:
    def test_a_sound_one_passes(self):
        assert check_challenge(sound_challenge()) == ([], [])

    def test_no_input_anywhere_is_flagged_as_unguardable(self):
        # The executor accepts printing the answer when there is no input to
        # compute from, so such a challenge cannot be an algorithm exercise.
        errors, warnings = check_challenge(sound_challenge(test_cases=[
            {'input': '', 'expected_output': 'Hello', 'is_hidden': False},
            {'input': '', 'expected_output': 'Hello', 'is_hidden': True},
            {'input': '', 'expected_output': 'Hello', 'is_hidden': True},
        ]))

        assert errors == []
        assert any('printing the expected output is a valid solution' in w
                   for w in warnings)

    def test_hidden_tests_reusing_a_visible_input_are_flagged(self):
        # They add no protection: the student already saw that input.
        _, warnings = check_challenge(sound_challenge(test_cases=[
            {'input': '2\n3', 'expected_output': '5', 'is_hidden': False},
            {'input': '2\n3', 'expected_output': '5', 'is_hidden': True},
            {'input': '2\n3', 'expected_output': '5', 'is_hidden': True},
        ]))

        assert any('no protection' in w for w in warnings)

    def test_a_missing_reference_solution_is_flagged(self):
        _, warnings = check_challenge(sound_challenge(solution_code={}))

        assert any('reference solution' in w for w in warnings)

    def test_all_tests_hidden_is_flagged(self):
        _, warnings = check_challenge(sound_challenge(test_cases=[
            {'input': '2\n3', 'expected_output': '5', 'is_hidden': True},
            {'input': '1\n1', 'expected_output': '2', 'is_hidden': True},
            {'input': '4\n4', 'expected_output': '8', 'is_hidden': True},
        ]))

        assert any('worked example' in w for w in warnings)


class TestSpottingALookupTable:
    def test_a_reference_that_prints_the_answers_is_caught(self):
        # An author can defeat their own challenge as easily as a student can.
        assert looks_like_a_lookup_table(sound_challenge(solution_code={
            'python': 'a=int(input())\nb=int(input())\n'
                      'print(5 if a==2 else 17)'})) is True

    def test_a_real_solution_is_not(self):
        assert looks_like_a_lookup_table(sound_challenge()) is False
