"""
Running and submitting.

The lab has no expected output, so there is no "correct" to assert against.
What can be pinned is everything around the execution: who may start one, whose
console a run id opens, what happens when a student presses Run twice, and that
a submission is judged on output the server produced rather than output the
browser claimed.

CELERY_TASK_ALWAYS_EAGER is on without a broker, so `.delay()` runs inline here.
"""
import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lab import execution
from apps.lab.models import (
    CodingLab, LabParticipant, LabProblem, LabProblemSet, LabSubmission,
)


@pytest.fixture(autouse=True)
def clean_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def instructor(db):
    return User.objects.create_user(
        username='ex_inst', email='ei@ssct.edu.ph', password='x', role='instructor')


@pytest.fixture
def lab(db, instructor):
    lab = CodingLab.objects.create(
        instructor=instructor, title='Lab', state='running', languages=['python'])
    problem_set = LabProblemSet.objects.create(lab=lab, label='Set A')
    LabProblem.objects.create(problem_set=problem_set, order=0,
                              title='Sum two numbers', statement='<p>Add them.</p>')
    return lab


@pytest.fixture
def student(db):
    return User.objects.create_user(
        username='ex_stu', email='es@ssct.edu.ph', password='x', role='student')


@pytest.fixture
def joined(lab, student):
    client = APIClient()
    client.force_authenticate(student)
    client.post('/api/lab/labs/join/', {'join_code': lab.join_code}, format='json')
    return client, LabParticipant.objects.get(lab=lab, student=student)


@pytest.mark.django_db
class TestRunning:
    def test_a_student_who_has_not_joined_cannot_run(self, lab, db):
        # 404, not 403: a lab a student has not joined is not in their
        # queryset, so they cannot even confirm it exists. Two guards again —
        # scoping first, the participant check behind it.
        stranger = User.objects.create_user(
            username='ex_out', email='eo@ssct.edu.ph', password='x')
        client = APIClient()
        client.force_authenticate(stranger)

        response = client.post(f'/api/lab/labs/{lab.id}/run/',
                               {'language': 'python', 'code': 'print(1)'}, format='json')

        assert response.status_code == 404

    def test_an_instructor_who_never_joined_their_own_lab_is_told_so(
            self, lab, instructor):
        # The path that does reach the participant check: an instructor can see
        # their own lab, but has no seat in it.
        client = APIClient()
        client.force_authenticate(instructor)

        response = client.post(f'/api/lab/labs/{lab.id}/run/',
                               {'language': 'python', 'code': 'print(1)'}, format='json')

        assert response.status_code == 403
        assert 'not joined' in response.data['detail'].lower()

    def test_a_language_the_lab_disallows_is_refused(self, joined, lab):
        client, _ = joined

        response = client.post(f'/api/lab/labs/{lab.id}/run/',
                               {'language': 'java', 'code': 'class X {}'}, format='json')

        assert response.status_code == 400
        assert 'python' in response.data['detail']

    def test_empty_code_is_refused_before_it_reaches_a_worker(self, joined, lab):
        client, _ = joined

        response = client.post(f'/api/lab/labs/{lab.id}/run/',
                               {'language': 'python', 'code': '   '}, format='json')

        assert response.status_code == 400

    def test_a_run_is_accepted_and_reports_its_place_in_the_queue(self, joined, lab):
        client, _ = joined

        response = client.post(f'/api/lab/labs/{lab.id}/run/',
                               {'language': 'python', 'code': 'print(1)'}, format='json')

        assert response.status_code == 202
        assert 'run_id' in response.data
        assert response.data['queue_position'] == 0

    def test_a_run_id_does_not_open_another_students_console(self, joined, lab, db):
        client, _ = joined
        started = client.post(f'/api/lab/labs/{lab.id}/run/',
                              {'language': 'python', 'code': 'print(1)'}, format='json')
        run_id = started.data['run_id']

        nosy = User.objects.create_user(
            username='ex_nosy', email='en@ssct.edu.ph', password='x')
        other = APIClient()
        other.force_authenticate(nosy)
        other.post('/api/lab/labs/join/', {'join_code': lab.join_code}, format='json')

        response = other.get(f'/api/lab/labs/{lab.id}/runs/{run_id}/')

        assert response.status_code == 403

    def test_the_instructor_may_read_a_run_in_their_own_lab(self, joined, lab, instructor):
        client, _ = joined
        run_id = client.post(f'/api/lab/labs/{lab.id}/run/',
                             {'language': 'python', 'code': 'print(1)'},
                             format='json').data['run_id']

        watcher = APIClient()
        watcher.force_authenticate(instructor)
        response = watcher.get(f'/api/lab/labs/{lab.id}/runs/{run_id}/')

        assert response.status_code == 200

    def test_an_expired_run_says_so_rather_than_hanging(self, joined, lab):
        client, _ = joined

        response = client.get(
            f'/api/lab/labs/{lab.id}/runs/00000000-0000-0000-0000-000000000000/')

        assert response.status_code == 404


@pytest.mark.django_db
class TestBackpressure:
    def test_pressing_run_again_supersedes_rather_than_queues(self, lab, student):
        participant = LabParticipant.objects.create(lab=lab, student=student)

        first = execution.start(lab_id=lab.id, participant_id=participant.id,
                                language='python', code='print(1)')
        second = execution.start(lab_id=lab.id, participant_id=participant.id,
                                 language='python', code='print(2)')

        # The queue is capped at one per student, which is what stops a room of
        # impatient people from building a queue nobody can drain.
        assert execution.get(first['id'])['state'] == execution.SUPERSEDED
        assert execution.get(second['id'])['state'] == execution.QUEUED

    def test_a_superseded_run_is_skipped_by_the_worker(self, lab, student):
        participant = LabParticipant.objects.create(lab=lab, student=student)
        first = execution.start(lab_id=lab.id, participant_id=participant.id,
                                language='python', code='print(1)')
        execution.start(lab_id=lab.id, participant_id=participant.id,
                        language='python', code='print(2)')

        assert execution.mark_running(first['id']) is None

    def test_the_queue_position_counts_down_as_runs_are_served(self, lab, student, db):
        others = [
            LabParticipant.objects.create(
                lab=lab,
                student=User.objects.create_user(
                    username=f'q{i}', email=f'q{i}@ssct.edu.ph', password='x'))
            for i in range(3)
        ]
        records = [execution.start(lab_id=lab.id, participant_id=p.id,
                                   language='python', code='print(1)') for p in others]

        assert execution.queue_position(records[0]) == 0
        assert execution.queue_position(records[2]) == 2

        execution.mark_running(records[0]['id'])
        assert execution.queue_position(execution.get(records[2]['id'])) == 1

    def test_a_finished_run_is_never_reported_as_waiting(self, lab, student):
        participant = LabParticipant.objects.create(lab=lab, student=student)
        record = execution.start(lab_id=lab.id, participant_id=participant.id,
                                 language='python', code='print(1)')
        execution.mark_running(record['id'])
        execution.finish(record['id'], stdout='1\n')

        assert execution.queue_position(execution.get(record['id'])) == 0

    def test_the_code_is_not_echoed_back_to_the_browser(self, lab, student):
        participant = LabParticipant.objects.create(lab=lab, student=student)
        record = execution.start(lab_id=lab.id, participant_id=participant.id,
                                 language='python', code='SECRET_MARKER')

        assert 'SECRET_MARKER' not in str(execution.public(record))


@pytest.mark.django_db
class TestSubmitting:
    def test_a_submission_records_the_servers_output_not_the_browsers(
            self, joined, lab):
        # The output in a student's browser is a DOM node they can edit. If the
        # instructor graded that string the exercise would be theatre.
        client, participant = joined
        problem = LabProblem.objects.first()

        response = client.post(f'/api/lab/labs/{lab.id}/submit/', {
            'problem': str(problem.id), 'language': 'python',
            'code': 'print("real")', 'student_output': 'a convincing lie',
        }, format='json')

        assert response.status_code == 201
        submission = LabSubmission.objects.get(id=response.data['id'])
        assert 'real' in submission.server_output
        assert submission.student_output == 'a convincing lie'
        assert submission.outputs_match is False

    def test_matching_output_is_not_flagged(self, joined, lab):
        client, _ = joined
        problem = LabProblem.objects.first()

        response = client.post(f'/api/lab/labs/{lab.id}/submit/', {
            'problem': str(problem.id), 'language': 'python',
            'code': 'print("hello")', 'student_output': 'hello',
        }, format='json')

        assert response.data['outputs_match'] is True

    def test_a_problem_from_another_set_is_refused(self, joined, lab):
        client, participant = joined
        other_set = LabProblemSet.objects.create(lab=lab, label='Set Z')
        not_mine = LabProblem.objects.create(
            problem_set=other_set, order=0, title='Theirs', statement='<p>x</p>')

        response = client.post(f'/api/lab/labs/{lab.id}/submit/', {
            'problem': str(not_mine.id), 'language': 'python', 'code': 'print(1)',
        }, format='json')

        assert response.status_code == 400

    def test_attempts_are_numbered(self, joined, lab):
        client, _ = joined
        problem = LabProblem.objects.first()
        payload = {'problem': str(problem.id), 'language': 'python', 'code': 'print(1)'}

        first = client.post(f'/api/lab/labs/{lab.id}/submit/', payload, format='json')
        second = client.post(f'/api/lab/labs/{lab.id}/submit/', payload, format='json')

        assert first.data['attempt_number'] == 1
        assert second.data['attempt_number'] == 2

    def test_an_accepted_problem_cannot_be_resubmitted(self, joined, lab):
        client, participant = joined
        problem = LabProblem.objects.first()
        LabSubmission.objects.create(
            participant=participant, problem=problem, attempt_number=1,
            language='python', code='x', status='accepted')

        response = client.post(f'/api/lab/labs/{lab.id}/submit/', {
            'problem': str(problem.id), 'language': 'python', 'code': 'print(1)',
        }, format='json')

        assert response.status_code == 400

    def test_a_closed_lab_refuses_submissions(self, joined, lab):
        client, _ = joined
        problem = LabProblem.objects.first()
        lab.state = 'closed'
        lab.save(update_fields=['state'])

        response = client.post(f'/api/lab/labs/{lab.id}/submit/', {
            'problem': str(problem.id), 'language': 'python', 'code': 'print(1)',
        }, format='json')

        assert response.status_code == 400
