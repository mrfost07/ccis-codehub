"""
Live-quiz retake isolation (Req 10): rejoining for a new attempt resets the
score and clears prior responses; single-attempt quizzes are unaffected.
"""
import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import (
    LiveQuiz, LiveQuizQuestion, LiveQuizSession, LiveQuizParticipant, LiveQuizResponse,
)


def _setup(max_retakes):
    instructor = User.objects.create_user(
        email='inst@ssct.edu.ph', username='inst', password='pw12345678', role='instructor'
    )
    quiz = LiveQuiz.objects.create(
        instructor=instructor, title='Q', creation_method='manual',
        quiz_mode='self_paced', max_retakes=max_retakes,
    )
    question = LiveQuizQuestion.objects.create(
        quiz=quiz, question_text='Pick A', question_type='multiple_choice',
        order=1, correct_answer='A', points=100,
    )
    session = LiveQuizSession.objects.create(quiz=quiz, status='in_progress')
    student = User.objects.create_user(
        email='stud@ssct.edu.ph', username='stud', password='pw12345678', role='student'
    )
    # A completed prior attempt: left_at set, has a score and a response.
    participant = LiveQuizParticipant.objects.create(
        session=session, student=student, nickname='stud',
        total_score=50, total_correct=1, total_attempted=1,
        left_at=timezone.now(), is_active=False,
    )
    LiveQuizResponse.objects.create(
        participant=participant, question=question,
        answer_text='A', is_correct=True, points_earned=50, response_time_seconds=2.0,
    )
    return quiz, participant, student


@pytest.mark.django_db
def test_retake_resets_score_and_clears_responses():
    quiz, participant, student = _setup(max_retakes=3)
    client = APIClient()
    client.force_authenticate(student)

    resp = client.post(
        '/api/learning/live-quiz/join_by_code/',
        {'join_code': quiz.join_code, 'nickname': 'stud'}, format='json',
    )
    assert resp.status_code in (200, 201), resp.data

    participant.refresh_from_db()
    assert participant.total_score == 0
    assert participant.total_attempted == 0
    assert LiveQuizResponse.objects.filter(participant=participant).count() == 0


@pytest.mark.django_db
def test_single_attempt_quiz_blocks_retake_and_keeps_score():
    quiz, participant, student = _setup(max_retakes=1)
    client = APIClient()
    client.force_authenticate(student)

    resp = client.post(
        '/api/learning/live-quiz/join_by_code/',
        {'join_code': quiz.join_code, 'nickname': 'stud'}, format='json',
    )
    # Max attempts reached — rejoin refused, prior attempt preserved.
    assert resp.status_code == 400
    participant.refresh_from_db()
    assert participant.total_score == 50
    assert LiveQuizResponse.objects.filter(participant=participant).count() == 1
