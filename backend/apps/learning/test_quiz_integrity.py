"""
Quiz-engine integrity tests: idempotent module completion (Req 6), server-side
scoring that ignores client-supplied score (Req 7), and single in-progress
attempt resolution (Req 11).
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserProfile
from apps.learning.models import (
    CareerPath, LearningModule, Quiz, Question, QuizAttempt,
)


@pytest.fixture
def user(db):
    u = User.objects.create_user(
        email='learner@ssct.edu.ph', username='learner', password='pw12345678', role='student'
    )
    UserProfile.objects.create(user=u)
    return u


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@pytest.fixture
def path(db):
    return CareerPath.objects.create(
        name='Test Path', slug='test-path', description='d',
        program_type='bsit', difficulty_level='beginner', estimated_duration=4,
    )


@pytest.fixture
def module(path):
    return LearningModule.objects.create(
        career_path=path, title='M1', description='d', module_type='text',
        difficulty_level='beginner', content='hello', order=1, points_reward=10,
    )


@pytest.fixture
def quiz(module):
    return Quiz.objects.create(
        learning_module=module, title='Q', description='d',
        time_limit_minutes=0, passing_score=70, max_attempts=3,
    )


@pytest.fixture
def question(quiz):
    return Question.objects.create(
        quiz=quiz, question_text='Pick A', question_type='multiple_choice',
        correct_answer='A', points=10, order=1,
    )


class TestModuleCompletionIdempotent:
    """Req 6: re-completing a finished module must not crash."""

    def test_recomplete_is_crash_free(self, client, module):
        url = f'/api/learning/modules/{module.id}/complete/'
        r1 = client.post(url)
        assert r1.status_code == 200, r1.data
        r2 = client.post(url)  # previously raised UnboundLocalError
        assert r2.status_code == 200, r2.data
        assert r2.data['is_completed'] is True


class TestServerSideScoring:
    """Req 7: score is computed server-side; client score/points are ignored."""

    def test_correct_answer_scores_full_despite_bogus_client_score(self, client, quiz, question):
        client.post(f'/api/learning/quizzes/{quiz.id}/start/')
        payload = {
            'score': 999, 'points': 999,
            'answers': [{'question_id': str(question.id), 'answer': 'A'}],
        }
        r = client.post(f'/api/learning/quizzes/{quiz.id}/submit/', payload, format='json')
        assert r.status_code == 200, r.data
        assert float(r.data['score']) == 100.0

    def test_wrong_answer_scores_zero_despite_bogus_client_score(self, client, quiz, question):
        client.post(f'/api/learning/quizzes/{quiz.id}/start/')
        payload = {
            'score': 100,
            'answers': [{'question_id': str(question.id), 'answer': 'B'}],
        }
        r = client.post(f'/api/learning/quizzes/{quiz.id}/submit/', payload, format='json')
        assert r.status_code == 200, r.data
        assert float(r.data['score']) == 0.0


class TestSingleInProgressAttempt:
    """Req 11: starting twice resumes one attempt; submit never 500s."""

    def test_start_twice_yields_one_attempt(self, client, user, quiz):
        client.post(f'/api/learning/quizzes/{quiz.id}/start/')
        client.post(f'/api/learning/quizzes/{quiz.id}/start/')
        count = QuizAttempt.objects.filter(user=user, quiz=quiz, status='in_progress').count()
        assert count == 1

    def test_submit_resolves_even_with_legacy_duplicates(self, client, user, quiz, question):
        # Simulate pre-fix state: two in-progress attempts.
        QuizAttempt.objects.create(user=user, quiz=quiz, status='in_progress')
        QuizAttempt.objects.create(user=user, quiz=quiz, status='in_progress')
        payload = {'answers': [{'question_id': str(question.id), 'answer': 'A'}]}
        r = client.post(f'/api/learning/quizzes/{quiz.id}/submit/', payload, format='json')
        assert r.status_code == 200, r.data  # not 500 MultipleObjectsReturned
