"""
The lab's authoring and joining surface.

What is pinned here is chosen from what has already gone wrong in this codebase:

  An answer key reaching students. Quiz questions were serialised with
  `fields = '__all__'` and handed `correct_answer` to anyone signed in. The
  lab's equivalent is `reference_solution`.

  A role check standing in for an ownership check. Any signed-in student could
  create and delete coding challenges because the viewset only asked whether
  they were authenticated. An instructor is not automatically entitled to edit
  another instructor's lab.

  Double-awarded progress. A double-clicked button is the ordinary way that
  happens, so acceptance is constrained in the database rather than in a view.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lab.models import (
    CodingLab, LabParticipant, LabProblem, LabProblemSet, LabSubmission,
    generate_join_code,
)
from apps.lab.serializers import sanitize_statement


@pytest.fixture
def instructor(db):
    return User.objects.create_user(
        username='lab_inst', email='li@ssct.edu.ph', password='x', role='instructor')


@pytest.fixture
def other_instructor(db):
    return User.objects.create_user(
        username='lab_inst2', email='li2@ssct.edu.ph', password='x', role='instructor')


@pytest.fixture
def student(db):
    return User.objects.create_user(
        username='lab_stu', email='ls@ssct.edu.ph', password='x', role='student')


@pytest.fixture
def lab(db, instructor):
    lab = CodingLab.objects.create(instructor=instructor, title='Week 5 Lab',
                                   state='running')
    for label in ('Set A', 'Set B'):
        problem_set = LabProblemSet.objects.create(lab=lab, label=label)
        LabProblem.objects.create(
            problem_set=problem_set, order=0, title=f'{label} problem',
            statement='<p>Reverse a list.</p>',
            reference_solution={'python': 'print("the answer")'})
    return lab


def client_for(user):
    api = APIClient()
    api.force_authenticate(user)
    return api


@pytest.mark.django_db
class TestTheAnswerKey:
    def test_a_student_never_receives_the_reference_solution(self, lab, student):
        client = client_for(student)
        client.post('/api/lab/labs/join/', {'join_code': lab.join_code}, format='json')

        response = client.get(f'/api/lab/labs/{lab.id}/my-problems/')

        assert response.status_code == 200
        body = str(response.data)
        assert 'reference_solution' not in body
        assert 'the answer' not in body

    def test_a_student_cannot_read_problems_through_the_authoring_endpoint(
            self, lab, student):
        response = client_for(student).get('/api/lab/problems/')

        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestOwnership:
    """
    Two independent guards, and the tests say which one is doing the work.

    Queryset scoping is primary — another instructor's lab is not in their
    queryset, so it 404s and they cannot learn it exists. `_is_owner` is the
    second guard, and it is what still denies if that scoping is ever widened
    (a shared instructor dashboard would do it). Asserting `403 or 404` hid
    which was which: removing the ownership check entirely left every test
    green.
    """

    def test_another_instructor_cannot_edit_your_lab(self, lab, other_instructor):
        response = client_for(other_instructor).patch(
            f'/api/lab/labs/{lab.id}/', {'title': 'Hijacked'}, format='json')

        assert response.status_code == 404, 'scoping should hide it entirely'
        lab.refresh_from_db()
        assert lab.title == 'Week 5 Lab'

    def test_another_instructor_cannot_delete_your_lab(self, lab, other_instructor):
        response = client_for(other_instructor).delete(f'/api/lab/labs/{lab.id}/')

        assert response.status_code == 404
        assert CodingLab.objects.filter(id=lab.id).exists()

    def test_the_ownership_check_denies_independently_of_scoping(
            self, lab, other_instructor, instructor, student):
        # Exercised directly, because no route currently reaches it — the
        # queryset gets there first. It exists so that widening the queryset
        # does not silently hand editing rights to every instructor.
        from apps.lab.views import _is_owner

        assert _is_owner(instructor, lab) is True
        assert _is_owner(other_instructor, lab) is False
        assert _is_owner(student, lab) is False

    def test_an_admin_may_act_on_any_lab(self, lab, db):
        admin = User.objects.create_user(
            username='lab_admin', email='la@ssct.edu.ph', password='x', role='admin')

        response = client_for(admin).patch(
            f'/api/lab/labs/{lab.id}/', {'title': 'Moderated'}, format='json')

        assert response.status_code == 200
        lab.refresh_from_db()
        assert lab.title == 'Moderated'

    def test_a_student_cannot_create_a_lab(self, student):
        response = client_for(student).post(
            '/api/lab/labs/', {'title': 'Mine now'}, format='json')

        assert response.status_code == 403

    def test_a_student_cannot_see_another_students_participants(self, lab, student):
        response = client_for(student).get(f'/api/lab/labs/{lab.id}/participants/')

        assert response.status_code in (403, 404)


@pytest.mark.django_db
class TestJoining:
    def test_joining_assigns_a_set(self, lab, student):
        response = client_for(student).post(
            '/api/lab/labs/join/', {'join_code': lab.join_code}, format='json')

        assert response.status_code == 201
        assert response.data['participant']['set_label'] in ('Set A', 'Set B')

    def test_rejoining_keeps_the_same_seat_and_set(self, lab, student):
        client = client_for(student)
        first = client.post('/api/lab/labs/join/',
                            {'join_code': lab.join_code}, format='json')
        second = client.post('/api/lab/labs/join/',
                             {'join_code': lab.join_code}, format='json')

        assert second.status_code == 200
        assert second.data['rejoined'] is True
        assert first.data['participant']['id'] == second.data['participant']['id']
        assert LabParticipant.objects.filter(lab=lab, student=student).count() == 1

    def test_set_assignment_is_deterministic(self, lab, student):
        # It must survive a reconnect and be reproducible when a student
        # disputes which problems they were given.
        assert lab.set_for(student) == lab.set_for(student)

    def test_a_draft_lab_is_indistinguishable_from_a_wrong_code(self, lab, student):
        lab.state = 'draft'
        lab.save(update_fields=['state'])

        response = client_for(student).post(
            '/api/lab/labs/join/', {'join_code': lab.join_code}, format='json')
        wrong = client_for(student).post(
            '/api/lab/labs/join/', {'join_code': 'ZZZZZZ'}, format='json')

        assert response.status_code == 404
        assert response.data == wrong.data

    def test_a_student_only_gets_their_own_set(self, lab, student):
        client = client_for(student)
        client.post('/api/lab/labs/join/', {'join_code': lab.join_code}, format='json')
        participant = LabParticipant.objects.get(lab=lab, student=student)

        response = client.get(f'/api/lab/labs/{lab.id}/my-problems/')

        assert response.data['set'] == participant.problem_set.label
        titles = [p['title'] for p in response.data['problems']]
        assert titles == [f'{participant.problem_set.label} problem']


@pytest.mark.django_db
class TestTheStateMachine:
    def test_a_closed_lab_cannot_be_reopened(self, lab, instructor):
        lab.state = 'closed'
        lab.save(update_fields=['state'])

        response = client_for(instructor).post(
            f'/api/lab/labs/{lab.id}/transition/', {'state': 'running'}, format='json')

        assert response.status_code == 400
        lab.refresh_from_db()
        assert lab.state == 'closed'

    def test_a_lab_with_no_problems_cannot_start(self, instructor):
        empty = CodingLab.objects.create(
            instructor=instructor, title='Empty', state='open')

        response = client_for(instructor).post(
            f'/api/lab/labs/{empty.id}/transition/', {'state': 'running'}, format='json')

        assert response.status_code == 400

    def test_submissions_close_when_late_ones_are_disallowed(self, lab):
        lab.state = 'review'
        lab.allow_late_submissions = False
        assert lab.accepts_submissions is False
        lab.allow_late_submissions = True
        assert lab.accepts_submissions is True


@pytest.mark.django_db
class TestAcceptanceIsIdempotent:
    def test_a_problem_cannot_be_accepted_twice(self, lab, student):
        from django.db import IntegrityError, transaction

        participant = LabParticipant.objects.create(lab=lab, student=student)
        problem = LabProblem.objects.first()
        LabSubmission.objects.create(
            participant=participant, problem=problem, attempt_number=1,
            language='python', code='x', status='accepted')

        # A second acceptance is the double-clicked Accept button. The database
        # refuses it, so no view can award progress twice by mistake.
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                LabSubmission.objects.create(
                    participant=participant, problem=problem, attempt_number=2,
                    language='python', code='y', status='accepted')

    def test_a_returned_attempt_does_not_block_a_later_acceptance(self, lab, student):
        participant = LabParticipant.objects.create(lab=lab, student=student)
        problem = LabProblem.objects.first()
        LabSubmission.objects.create(
            participant=participant, problem=problem, attempt_number=1,
            language='python', code='x', status='returned')

        LabSubmission.objects.create(
            participant=participant, problem=problem, attempt_number=2,
            language='python', code='y', status='accepted')

        assert LabSubmission.objects.filter(
            participant=participant, status='accepted').count() == 1


@pytest.mark.django_db
class TestSanitising:
    @pytest.mark.parametrize('payload', [
        '<script>alert(1)</script>',
        '<img src=x onerror="alert(1)">',
        '<a href="javascript:alert(1)">click</a>',
        '<iframe src="https://evil.example"></iframe>',
    ])
    def test_a_statement_cannot_carry_script(self, payload):
        # An instructor account is not a licence to run script in a student's
        # session, and instructors paste from the web.
        cleaned = sanitize_statement(payload)

        assert '<script' not in cleaned.lower()
        assert 'onerror' not in cleaned.lower()
        assert 'javascript:' not in cleaned.lower()
        assert '<iframe' not in cleaned.lower()

    def test_ordinary_formatting_survives(self):
        cleaned = sanitize_statement(
            '<p>Return the <strong>sum</strong>.</p><pre><code>f(1)</code></pre>')

        assert '<strong>' in cleaned
        assert '<pre>' in cleaned and '<code>' in cleaned

    def test_it_is_applied_on_write(self, instructor, lab):
        problem_set = lab.problem_sets.first()

        response = client_for(instructor).post('/api/lab/problems/', {
            'problem_set': str(problem_set.id), 'order': 1, 'title': 'XSS',
            'statement': '<p>ok</p><script>alert(1)</script>',
        }, format='json')

        assert response.status_code == 201
        assert '<script' not in LabProblem.objects.get(id=response.data['id']).statement


@pytest.mark.django_db
class TestJoinCodes:
    def test_it_avoids_characters_students_misread(self):
        # These get typed off a projector at the back of a room.
        codes = ''.join(generate_join_code() for _ in range(50))

        assert not set(codes) & set('O0I1S5')

    def test_it_does_not_hand_out_a_code_already_in_use(self, instructor):
        taken = CodingLab.objects.create(instructor=instructor, title='A').join_code

        codes = {generate_join_code() for _ in range(30)}

        assert taken not in codes
