"""
Importing quiz slides into gradeable questions.

Quizzes were seeded with their questions as HTML slides in `Quiz.content`. The
learning admin renders that HTML, so a quiz looks authored there, while the
student page reads the Question table — which was empty for every quiz in the
database. Students got a quiz with no questions.

The part that has to be exactly right is `correct_answer`: grading does
`str(user_answer) == str(question.correct_answer)` and the client submits
`choice.id`, so it must hold the correct choice's id. Putting the choice text
there marks every answer wrong, and nothing about the import would look broken.
"""
import pytest
from django.core.management import call_command
from io import StringIO

from apps.learning.models import (
    CareerPath, LearningModule, Question, QuestionChoice, Quiz,
)
from apps.learning.management.commands.import_quiz_questions import parse_slides


SLIDE = '''
<div class="module-slide" data-slide="1">
  <h2>Question 1: Levels of Analysis</h2>
  <div class="question-content"><p>Which level of analysis is that?</p></div>
  <div class="question-info"><span>MULTIPLE CHOICE</span><span>2 points</span></div>
  <div class="quiz-choices">
    <div class="quiz-choice" data-choice-id="1" data-correct="false">
      <label><input type="radio"><span>A. Diagnostic</span></label>
    </div>
    <div class="quiz-choice" data-choice-id="2" data-correct="true">
      <label><input type="radio"><span>B. Predictive</span></label>
    </div>
  </div>
</div>
'''

PROSE_SLIDE = '''
<div class="module-slide" data-slide="9">
  <h2 class="slide-title">What Data Science Actually Is</h2>
  <div class="slide-content"><p>Some teaching prose, not a question.</p></div>
</div>
'''


class TestParsingSlides:
    def test_reads_the_prompt_type_points_and_choices(self):
        parsed = parse_slides(SLIDE)

        assert len(parsed) == 1
        question = parsed[0]
        assert question['text'] == 'Which level of analysis is that?'
        assert question['type'] == 'multiple_choice'
        assert question['points'] == 2
        assert [c['text'] for c in question['choices']] == ['Diagnostic', 'Predictive']
        assert [c['correct'] for c in question['choices']] == [False, True]

    def test_strips_the_rendered_letter_prefix(self):
        # The slides show "A. ", "B. ". Keeping it would double up with whatever
        # the quiz UI numbers the choices with.
        assert parse_slides(SLIDE)[0]['choices'][0]['text'] == 'Diagnostic'

    def test_ignores_prose_slides(self):
        # Modules use module-slide for teaching content too; importing those would
        # create empty questions.
        assert parse_slides(PROSE_SLIDE) == []

    def test_handles_content_with_no_slides(self):
        assert parse_slides('') == []
        assert parse_slides('<p>nothing here</p>') == []

    def test_reads_several_questions_from_one_quiz(self):
        assert len(parse_slides(SLIDE + SLIDE + PROSE_SLIDE)) == 2


@pytest.fixture
def quiz(db):
    path = CareerPath.objects.create(
        name='Imported Path', slug='imported-path', description='d',
        program_type='BSCS', difficulty_level='beginner', estimated_duration=4,
    )
    module = LearningModule.objects.create(
        career_path=path, title='Module 1', description='d', order=0,
    )
    return Quiz.objects.create(
        learning_module=module, title='Module 1 Quiz', description='d',
        content=SLIDE,
    )


def _run(**kwargs):
    out = StringIO()
    call_command('import_quiz_questions', stdout=out, **kwargs)
    return out.getvalue()


@pytest.mark.django_db
class TestImporting:
    def test_creates_the_question_and_its_choices(self, quiz):
        _run()

        question = Question.objects.get()
        assert question.quiz == quiz
        assert question.question_text == 'Which level of analysis is that?'
        assert question.points == 2
        assert question.choices.count() == 2

    def test_correct_answer_is_the_choice_id_that_grading_compares(self, quiz):
        # The contract: QuizViewSet._check_answer compares against
        # correct_answer, and the client submits choice.id.
        _run()

        question = Question.objects.get()
        winner = QuestionChoice.objects.get(question=question, is_correct=True)
        assert str(question.correct_answer) == str(winner.id)

    def test_a_student_picking_the_right_choice_is_marked_correct(self, quiz):
        # End to end through the real grader, so a format change cannot pass here
        # and fail in production.
        from apps.learning.views import QuizViewSet
        _run()

        question = Question.objects.get()
        winner = QuestionChoice.objects.get(question=question, is_correct=True)
        loser = QuestionChoice.objects.get(question=question, is_correct=False)

        check = QuizViewSet()._check_answer
        assert check(question, str(winner.id)) is True
        assert check(question, str(loser.id)) is False

    def test_running_twice_does_not_duplicate(self, quiz):
        _run()
        _run()

        assert Question.objects.filter(quiz=quiz).count() == 1

    def test_dry_run_changes_nothing(self, quiz):
        output = _run(dry_run=True)

        assert Question.objects.count() == 0
        assert 'would create 1 question' in output

    def test_a_question_with_no_correct_choice_is_skipped(self, db):
        # It would be unpassable, and silently so.
        path = CareerPath.objects.create(
            name='P2', slug='p2', description='d',
            program_type='BSCS', difficulty_level='beginner', estimated_duration=4,
        )
        module = LearningModule.objects.create(
            career_path=path, title='M', description='d', order=0,
        )
        Quiz.objects.create(
            learning_module=module, title='Broken quiz', description='d',
            content=SLIDE.replace('data-correct="true"', 'data-correct="false"'),
        )

        output = _run()

        assert Question.objects.count() == 0
        assert 'no correct answer in the slide' in output
        # Named, not just counted: somebody has to go and author the answer.
        assert 'Broken quiz' in output
        assert 'Which level of analysis' in output

    def test_a_quiz_that_already_has_questions_is_left_alone(self, quiz):
        existing = Question.objects.create(
            quiz=quiz, question_text='hand written', question_type='short_answer',
            correct_answer='x', points=1, order=0,
        )

        _run()

        assert list(Question.objects.filter(quiz=quiz)) == [existing]
