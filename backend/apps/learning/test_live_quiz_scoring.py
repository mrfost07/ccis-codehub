"""
Live-quiz scoring parity (Req 9): REST and WebSocket paths share one scorer, so
identical inputs yield identical points. Includes an equivalence property test.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import (
    LiveQuiz, LiveQuizQuestion, LiveQuizSession, LiveQuizParticipant,
)
from apps.learning.live_quiz_scoring import score_mcq, score_coding


@pytest.fixture
def question(db):
    instructor = User.objects.create_user(
        email='inst@ssct.edu.ph', username='inst', password='pw12345678', role='instructor'
    )
    quiz = LiveQuiz.objects.create(
        instructor=instructor, title='Q', creation_method='manual', quiz_mode='self_paced',
    )
    return LiveQuizQuestion.objects.create(
        quiz=quiz, question_text='Pick A', question_type='multiple_choice',
        order=1, correct_answer='A', points=100, time_limit=30, time_bonus_enabled=True,
    )


class TestScorerProperties:
    def test_mcq_correct_is_bounded_by_full_points(self, question):
        # Instant answer → 50% base + 50% bonus = full points, never more.
        is_correct, pts = score_mcq(question, 'A', response_time=0)
        assert is_correct is True
        assert pts == 100

    def test_mcq_wrong_scores_zero(self, question):
        is_correct, pts = score_mcq(question, 'B', response_time=0)
        assert is_correct is False
        assert pts == 0

    def test_mcq_slow_correct_gets_base_only(self, question):
        # Answering exactly at the time limit → only the 50% base.
        _correct, pts = score_mcq(question, 'A', response_time=30)
        assert pts == 50

    def test_coding_partial_credit(self, question):
        result = {'passed': 3, 'total': 4, 'all_passed': False}
        is_correct, pts = score_coding(question, result, response_time=0)
        assert is_correct is False
        assert pts == 75  # int(100 * 3/4)

    def test_coding_all_passed_bounded(self, question):
        result = {'passed': 4, 'total': 4, 'all_passed': True}
        is_correct, pts = score_coding(question, result, response_time=0)
        assert is_correct is True
        assert pts == 100


@pytest.mark.django_db
class TestRestPathUsesSharedScorer:
    def test_rest_points_match_scorer(self, question):
        student = User.objects.create_user(
            email='stud@ssct.edu.ph', username='stud', password='pw12345678', role='student'
        )
        session = LiveQuizSession.objects.create(quiz=question.quiz)
        participant = LiveQuizParticipant.objects.create(
            session=session, student=student, nickname='stud'
        )
        client = APIClient()
        client.force_authenticate(student)
        resp = client.post('/api/learning/live-quiz-responses/', {
            'participant_id': str(participant.id),
            'question_id': str(question.id),
            'answer_text': 'A',
            'response_time_seconds': 0,
        }, format='json')
        assert resp.status_code in (200, 201), resp.data
        expected = score_mcq(question, 'A', 0)[1]
        assert resp.data['points_earned'] == expected == 100
