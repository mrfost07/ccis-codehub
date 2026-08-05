"""
Live quiz IDOR scoping: instructors only manage their own questions (Req 8.3),
and responses are visible only to the student who made them or the owning
instructor (Req 8.2).
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import (
    LiveQuiz, LiveQuizQuestion, LiveQuizSession, LiveQuizParticipant, LiveQuizResponse,
)


def _user(name, role='student'):
    return User.objects.create_user(
        email=f'{name}@ssct.edu.ph', username=name, password='pw12345678', role=role
    )


@pytest.fixture
def instructor1(db):
    return _user('inst1', role='instructor')


@pytest.fixture
def quiz(instructor1):
    q = LiveQuiz.objects.create(
        instructor=instructor1, title='Quiz 1', creation_method='manual',
    )
    LiveQuizQuestion.objects.create(
        quiz=q, question_text='Pick A', question_type='multiple_choice',
        order=1, correct_answer='A',
    )
    return q


def _client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class TestQuestionOwnershipScoping:
    """Req 8.3: an instructor cannot see/edit another instructor's questions."""

    def test_other_instructor_sees_no_questions(self, quiz):
        other = _user('inst2', role='instructor')
        resp = _client(other).get(f'/api/learning/live-quiz-questions/?quiz_id={quiz.id}')
        assert resp.status_code == 200
        data = resp.data.get('results', resp.data)
        assert data == []

    def test_owner_sees_own_questions(self, quiz, instructor1):
        resp = _client(instructor1).get(f'/api/learning/live-quiz-questions/?quiz_id={quiz.id}')
        assert resp.status_code == 200
        data = resp.data.get('results', resp.data)
        assert len(data) == 1


class TestResponseScoping:
    """Req 8.2: responses are visible only to the owner student or instructor."""

    def _make_response(self, quiz):
        student = _user('taker')
        session = LiveQuizSession.objects.create(quiz=quiz)
        participant = LiveQuizParticipant.objects.create(
            session=session, student=student, nickname='taker'
        )
        question = quiz.live_questions.first()
        resp = LiveQuizResponse.objects.create(
            participant=participant, question=question,
            answer_text='A', is_correct=True, response_time_seconds=1.0,
        )
        return student, resp

    def test_owner_student_sees_own_response(self, quiz):
        student, _resp = self._make_response(quiz)
        r = _client(student).get('/api/learning/live-quiz-responses/')
        assert r.status_code == 200
        data = r.data.get('results', r.data)
        assert len(data) == 1

    def test_other_student_cannot_see_response(self, quiz):
        _student, _resp = self._make_response(quiz)
        stranger = _user('stranger')
        r = _client(stranger).get('/api/learning/live-quiz-responses/')
        assert r.status_code == 200
        data = r.data.get('results', r.data)
        assert data == []

    def test_owning_instructor_sees_response(self, quiz, instructor1):
        self._make_response(quiz)
        r = _client(instructor1).get('/api/learning/live-quiz-responses/')
        assert r.status_code == 200
        data = r.data.get('results', r.data)
        assert len(data) == 1


class TestFullscreenSkipIsRecorded:
    """Declining the fullscreen reminder must cost the same as leaving it.

    _record_violation only increments for violation types it recognises, so a new
    type that is not listed there is silently free — the student would be told
    "this is recorded" and nothing would be recorded.
    """

    def _participant(self, quiz, **quiz_kwargs):
        for field, value in quiz_kwargs.items():
            setattr(quiz, field, value)
        if quiz_kwargs:
            quiz.save()
        session = LiveQuizSession.objects.create(quiz=quiz)
        return LiveQuizParticipant.objects.create(
            session=session, student=_user('skipper'), nickname='skipper',
        )

    def _record(self, participant, violation_type):
        from apps.learning.consumers import LiveQuizConsumer
        # The synchronous body behind the async wrapper.
        return LiveQuizConsumer._record_violation.__wrapped__(
            None, participant.id, violation_type,
        )

    def test_a_skip_increments_the_fullscreen_count(self, quiz):
        participant = self._participant(quiz)

        result = self._record(participant, 'fullscreen_skip')

        participant.refresh_from_db()
        assert result['success'] is True
        assert participant.fullscreen_violations == 1
        assert result['total_violations'] == 1

    def test_a_skip_costs_the_same_as_an_exit(self, quiz):
        # Two participants in ONE session: LiveQuizSession is unique per quiz, so
        # a second session for the same quiz cannot exist.
        skipper = self._participant(quiz)
        leaver = LiveQuizParticipant.objects.create(
            session=skipper.session, student=_user('leaver'), nickname='leaver',
        )

        self._record(skipper, 'fullscreen_skip')
        self._record(leaver, 'fullscreen_exit')
        skipper.refresh_from_db()
        leaver.refresh_from_db()

        assert skipper.fullscreen_violations == leaver.fullscreen_violations == 1

    def test_a_skip_uses_the_fullscreen_action(self, quiz):
        # Not the default 'warn': the instructor configured what a fullscreen
        # problem should do, and declining is a fullscreen problem.
        participant = self._participant(quiz, fullscreen_exit_action='pause')

        result = self._record(participant, 'fullscreen_skip')

        assert result['action'] == 'pause'

    def test_enough_skips_flag_the_attempt(self, quiz):
        participant = self._participant(quiz, max_violations=2)

        self._record(participant, 'fullscreen_skip')
        second = self._record(participant, 'fullscreen_skip')

        participant.refresh_from_db()
        assert participant.is_flagged is True
        assert second['is_flagged'] is True

    def test_an_unknown_type_still_records_nothing(self, quiz):
        # The reason the alias had to be added explicitly, pinned so it stays true.
        participant = self._participant(quiz)

        result = self._record(participant, 'invented_violation')

        participant.refresh_from_db()
        assert participant.fullscreen_violations == 0
        assert result['total_violations'] == 0
