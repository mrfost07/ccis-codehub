"""
Clearing questions the grader scores backwards.

An imported short_answer question stored `correct_answer=''`, and _check_answer
compares the submitted text to it exactly — so a blank submission was marked
correct and a real answer wrong. This removes them.

The care needed is in what it must NOT delete: a question a student has already
answered (deleting cascades the answer away, changing a submitted attempt), and
any question that does have a usable answer.
"""
import pytest
from io import StringIO
from django.core.management import call_command

from apps.accounts.models import User
from apps.learning.models import (
    Answer, CareerPath, LearningModule, Question, QuestionChoice, Quiz,
    QuizAttempt,
)


def _run(**kwargs):
    out = StringIO()
    call_command('prune_ungradeable_questions', stdout=out, **kwargs)
    return out.getvalue()


@pytest.fixture
def quiz(db):
    path = CareerPath.objects.create(
        name='PF', slug='pf-prune', description='d', program_type='BSCS',
        difficulty_level='beginner', estimated_duration=4,
    )
    module = LearningModule.objects.create(
        career_path=path, title='M', description='d', order=0)
    return Quiz.objects.create(
        learning_module=module, title='Q', description='d', content='')


def written(quiz, text='Describe the purpose of input().'):
    return Question.objects.create(
        quiz=quiz, question_text=text, question_type='short_answer',
        correct_answer='', points=2, order=0)


def multiple_choice(quiz):
    question = Question.objects.create(
        quiz=quiz, question_text='Which keyword?', question_type='multiple_choice',
        correct_answer='', points=1, order=1)
    right = QuestionChoice.objects.create(
        question=question, choice_text='def', is_correct=True, order=0)
    QuestionChoice.objects.create(
        question=question, choice_text='function', is_correct=False, order=1)
    question.correct_answer = str(right.id)
    question.save(update_fields=['correct_answer'])
    return question


@pytest.mark.django_db
class TestPruning:
    def test_removes_a_question_with_no_usable_answer(self, quiz):
        written(quiz)

        _run()

        assert Question.objects.count() == 0

    def test_names_what_it_removes(self, quiz):
        written(quiz)

        assert 'Describe the purpose' in _run(dry_run=True)

    def test_dry_run_changes_nothing(self, quiz):
        written(quiz)

        output = _run(dry_run=True)

        assert Question.objects.count() == 1
        assert 'would delete 1' in output

    def test_leaves_a_gradeable_question_alone(self, quiz):
        keep = multiple_choice(quiz)
        written(quiz)

        _run()

        assert list(Question.objects.all()) == [keep]

    def test_leaves_a_true_false_question_alone(self, quiz):
        # correct_answer is the word, not a choice id, and there may be no
        # is_correct choice — a careless filter would sweep these up.
        keep = Question.objects.create(
            quiz=quiz, question_text='True or False: x', question_type='true_false',
            correct_answer='true', points=1, order=2)

        _run()

        assert list(Question.objects.all()) == [keep]

    def test_will_not_delete_one_a_student_has_answered(self, quiz):
        # Deleting cascades the Answer away, quietly rewriting a submitted
        # attempt.
        question = written(quiz)
        student = User.objects.create_user(
            username='p_stu', email='p@ssct.edu.ph', password='x', role='student')
        attempt = QuizAttempt.objects.create(
            user=student, quiz=quiz, status='completed')
        Answer.objects.create(
            quiz_attempt=attempt, question=question,
            answer_data={'answer': 'a real answer'}, is_correct=False)

        output = _run()

        assert Question.objects.filter(id=question.id).exists()
        assert Answer.objects.count() == 1
        assert 'already answered' in output
