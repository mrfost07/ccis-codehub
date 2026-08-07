"""
Phase 0 of the career-path buildout: repairing what is already there.

Two commands, both touching live student records, so both are written to refuse
rather than guess:

  prune_empty_quizzes  removes placeholder quizzes nobody could answer, but
                       never one somebody has attempted.
  merge_career_paths   folds a duplicate path into the one being kept, moving
                       enrolments and progress, but never colliding with a
                       record the student already has on the target.
"""
import pytest
from io import StringIO
from django.core.management import CommandError, call_command

from apps.accounts.models import User
from apps.learning.models import (
    CareerPath, CareerRole, Certificate, Enrollment, LearningModule, Question,
    Quiz, QuizAttempt, UserProgress,
)


def _run(command, **kwargs):
    out = StringIO()
    call_command(command, stdout=out, **kwargs)
    return out.getvalue()


def make_path(name, slug, program='bscs'):
    return CareerPath.objects.create(
        name=name, slug=slug, description='d', program_type=program,
        difficulty_level='beginner', estimated_duration=4, is_active=True)


def make_quiz(path, title='Quiz for Module 1', content=''):
    module = LearningModule.objects.create(
        career_path=path, title='M', description='d',
        order=path.modules.count())
    return Quiz.objects.create(
        learning_module=module, title=title, description='d', content=content)


def make_student(username):
    return User.objects.create_user(
        username=username, email=f'{username}@ssct.edu.ph', password='x',
        role='student')


@pytest.mark.django_db
class TestPruningEmptyQuizzes:
    def test_removes_a_quiz_nobody_could_answer(self, db):
        path = make_path('P', 'p-prune')
        make_quiz(path)

        _run('prune_empty_quizzes')

        assert Quiz.objects.count() == 0

    def test_keeps_a_quiz_that_has_content(self, db):
        path = make_path('P', 'p-content')
        make_quiz(path, content='<div class="module-slide">x</div>')

        _run('prune_empty_quizzes')

        assert Quiz.objects.count() == 1

    def test_keeps_an_empty_quiz_somebody_has_attempted(self, db):
        # The attempt is a student's record; the quiz is the only thing it
        # points at, and deleting cascades it away.
        path = make_path('P', 'p-attempted')
        quiz = make_quiz(path)
        student = make_student('prune_stu')
        QuizAttempt.objects.create(user=student, quiz=quiz, status='completed')

        output = _run('prune_empty_quizzes')

        assert Quiz.objects.filter(id=quiz.id).exists()
        assert QuizAttempt.objects.count() == 1
        assert 'left in place' in output

    def test_keeps_an_empty_quiz_that_somehow_has_questions(self, db):
        path = make_path('P', 'p-questions')
        quiz = make_quiz(path)
        Question.objects.create(
            quiz=quiz, question_text='q', question_type='true_false',
            correct_answer='true', points=1, order=0)

        _run('prune_empty_quizzes')

        assert Quiz.objects.filter(id=quiz.id).exists()

    def test_dry_run_changes_nothing(self, db):
        path = make_path('P', 'p-dry')
        make_quiz(path)

        output = _run('prune_empty_quizzes', dry_run=True)

        assert Quiz.objects.count() == 1
        assert 'would delete 1' in output


@pytest.fixture
def merge_setup(db):
    keep = make_path('Data Structures', 'ds-keep', 'bscs')
    retire = make_path('Data Structures', 'ds-retire', 'bsit')
    student = make_student('merge_stu')
    Enrollment.objects.create(user=student, career_path=retire, status='active')
    UserProgress.objects.create(
        user=student, career_path=retire, completion_percentage=40)
    return keep, retire, student


@pytest.mark.django_db
class TestMergingPaths:
    def test_moves_the_enrolment_and_the_progress(self, merge_setup):
        keep, retire, student = merge_setup

        _run('merge_career_paths', source='ds-retire', target='ds-keep')

        assert Enrollment.objects.get(user=student).career_path == keep
        progress = UserProgress.objects.get(user=student)
        assert progress.career_path == keep
        # Moved, not reset — the student keeps where they got to.
        assert progress.completion_percentage == 40

    def test_retires_the_duplicate_without_deleting_it(self, merge_setup):
        keep, retire, _ = merge_setup

        _run('merge_career_paths', source='ds-retire', target='ds-keep')

        retire.refresh_from_db()
        keep.refresh_from_db()
        assert retire.is_active is False
        assert keep.is_active is True
        # Still there: its modules and quizzes remain reachable to an admin.
        assert CareerPath.objects.filter(slug='ds-retire').exists()

    def test_leaves_the_modules_where_they_are(self, merge_setup):
        # Appending one path's modules to another gives duplicate lessons in an
        # arbitrary order. The student continues on the winner's modules.
        keep, retire, _ = merge_setup
        LearningModule.objects.create(
            career_path=retire, title='Retired module', description='d', order=0)

        _run('merge_career_paths', source='ds-retire', target='ds-keep')

        assert keep.modules.count() == 0
        assert retire.modules.count() == 1

    def test_repoints_a_role_that_pointed_at_the_duplicate(self, merge_setup):
        keep, retire, _ = merge_setup
        role = CareerRole.objects.create(
            name='Data Engineer', slug='bscs-data-engineer-merge',
            program_type='bscs', category='Data and AI', summary='s',
            career_path=retire)

        _run('merge_career_paths', source='ds-retire', target='ds-keep')

        role.refresh_from_db()
        assert role.career_path == keep

    def test_will_not_move_a_record_the_student_already_has_on_the_target(self, merge_setup):
        # Enrollment is unique per (user, path); moving would collide and the
        # whole merge would fail part-way.
        keep, retire, student = merge_setup
        Enrollment.objects.create(user=student, career_path=keep, status='active')

        output = _run('merge_career_paths', source='ds-retire', target='ds-keep')

        assert Enrollment.objects.filter(user=student, career_path=retire).count() == 1
        assert Enrollment.objects.filter(user=student, career_path=keep).count() == 1
        assert 'already on the target' in output

    def test_moves_a_certificate_too(self, merge_setup):
        keep, retire, student = merge_setup
        enrolment = Enrollment.objects.get(user=student, career_path=retire)
        certificate = Certificate.objects.create(
            user=student, career_path=retire, enrollment=enrolment,
            certificate_id='CCIS-2026-MERGE0001')

        _run('merge_career_paths', source='ds-retire', target='ds-keep')

        certificate.refresh_from_db()
        assert certificate.career_path == keep

    def test_dry_run_changes_nothing(self, merge_setup):
        keep, retire, student = merge_setup

        output = _run('merge_career_paths', source='ds-retire', target='ds-keep',
                      dry_run=True)

        retire.refresh_from_db()
        assert retire.is_active is True
        assert Enrollment.objects.get(user=student).career_path == retire
        assert 'nothing changed' in output

    def test_refuses_an_unknown_path(self, merge_setup):
        with pytest.raises(CommandError):
            _run('merge_career_paths', source='nope', target='ds-keep')

    def test_refuses_to_merge_a_path_into_itself(self, merge_setup):
        with pytest.raises(CommandError):
            _run('merge_career_paths', source='ds-keep', target='ds-keep')
