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
from apps.learning.management.commands import import_quiz_questions as cmd
from apps.learning.management.commands.import_quiz_questions import (
    AUTHORED_ANSWERS, apply_authored_answer, normalise, parse_slides,
)


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


TRUE_FALSE_SLIDE = '''
<div class="module-slide" data-slide="3">
  <h2>Question 3</h2>
  <div class="question-content"><p>True or False: {prompt}</p></div>
  <div class="question-info"><span>TRUE / FALSE</span><span>1 point</span></div>
  <div class="quiz-choices">
    <div class="quiz-choice" data-choice-id="1" data-correct="false">
      <label><input type="radio"><span>True</span></label>
    </div>
    <div class="quiz-choice" data-choice-id="2" data-correct="false">
      <label><input type="radio"><span>False</span></label>
    </div>
  </div>
</div>
'''


WHILE_LOOP = 'A while loop can run forever if its condition never becomes false.'


def _true_false(prompt):
    return TRUE_FALSE_SLIDE.replace('{prompt}', prompt)


class TestAuthoredAnswers:
    """
    Nine true/false slides mark neither choice correct, so the answer is not in
    the content. They are settled Python semantics, so they are authored in the
    command rather than left for somebody to retype.

    What has to hold: the table reaches the questions it is for, it does not
    reach anything else, and the answer it writes is the one grading will accept.
    """

    def test_fills_in_an_answer_the_slide_does_not_carry(self):
        parsed = parse_slides(_true_false(
            'The input() function always returns a string, regardless of what '
            'the user types.'))

        assert apply_authored_answer(parsed[0]) is True
        assert [c['correct'] for c in parsed[0]['choices']] == [True, False]

    def test_marks_false_where_the_answer_is_false(self):
        # A table that only ever said "True" would pass a test that checked one
        # direction.
        parsed = parse_slides(_true_false(
            'All Python functions must explicitly return a value using the '
            'return keyword.'))

        assert apply_authored_answer(parsed[0]) is True
        assert [c['correct'] for c in parsed[0]['choices']] == [False, True]

    def test_leaves_a_question_it_has_no_answer_for_alone(self):
        parsed = parse_slides(_true_false('Some question nobody authored.'))

        assert apply_authored_answer(parsed[0]) is False
        assert not any(c['correct'] for c in parsed[0]['choices'])

    def test_does_not_answer_a_question_of_another_shape(self):
        # Keyed by text: a multiple-choice question that happened to read the
        # same would otherwise get an answer marked by coincidence.
        item = {
            'text': 'A while loop can run forever if its condition never becomes false.',
            'type': 'multiple_choice', 'points': 1,
            'choices': [{'text': 'Yes', 'correct': False},
                        {'text': 'No', 'correct': False}],
        }

        assert apply_authored_answer(item) is False

    def test_matching_ignores_punctuation_and_the_lead_in(self):
        assert (normalise('True or False: The value True is a boolean value.')
                == normalise('the  value true is a  boolean value'))

    def test_every_authored_answer_is_reachable(self):
        # A key that matches nothing is a silent no-op: the question stays
        # unimportable and the table looks like it covers it.
        for key in AUTHORED_ANSWERS:
            assert normalise(key) == key, f'key is not in normalised form: {key}'

    @pytest.mark.django_db
    def test_an_authored_question_is_imported_and_grades(self, db):
        # End to end through the real grader.
        from apps.learning.views import QuizViewSet
        path = CareerPath.objects.create(
            name='PF', slug='pf-authored', description='d',
            program_type='BSCS', difficulty_level='beginner', estimated_duration=4,
        )
        module = LearningModule.objects.create(
            career_path=path, title='M', description='d', order=0)
        Quiz.objects.create(
            learning_module=module, title='Module 5 Quiz', description='d',
            content=_true_false(
                'The input() function always returns a string, regardless of '
                'what the user types.'),
        )

        output = _run()

        question = Question.objects.get()
        assert question.question_type == 'true_false'
        assert question.correct_answer == 'true'
        assert 'authored table' in output
        check = QuizViewSet()._check_answer
        assert check(question, 'true') is True
        assert check(question, 'false') is False


@pytest.mark.django_db
class TestFillingMissingQuestions:
    """
    An earlier run skipped the questions whose answer was not in the slide. The
    quiz then had questions, so the idempotency guard skipped the whole quiz on
    every later run — the skipped ones could never come in.
    """

    def test_the_default_run_still_leaves_a_finished_quiz_alone(self, quiz):
        _run()
        Question.objects.update(question_text='hand edited')

        _run()

        assert Question.objects.count() == 1
        assert Question.objects.get().question_text == 'hand edited'

    def test_fill_missing_adds_only_what_is_absent(self, quiz, monkeypatch):
        quiz.content = SLIDE + _true_false(WHILE_LOOP)
        quiz.save(update_fields=['content'])
        # The first run does not know the answer, so it skips that question --
        # which is how production ended up with nine of them missing.
        monkeypatch.setattr(cmd, 'AUTHORED_ANSWERS', {})
        _run()
        assert Question.objects.count() == 1

        monkeypatch.undo()
        _run(fill_missing=True)

        assert Question.objects.count() == 2
        added = Question.objects.get(question_type='true_false')
        assert added.correct_answer == 'true'

    def test_fill_missing_does_not_duplicate_the_ones_already_there(self, quiz):
        _run()
        first = Question.objects.get()

        _run(fill_missing=True)

        assert list(Question.objects.all()) == [first]

    def test_the_added_question_takes_the_slide_position_left_empty(self, quiz, monkeypatch):
        # The first run numbered by slide index and skipped one, so there is a
        # gap. Filling it anywhere else reorders the quiz for every student.
        quiz.content = SLIDE + _true_false(WHILE_LOOP) + SLIDE.replace(
            'Which level of analysis is that?', 'A third question?')
        quiz.save(update_fields=['content'])
        monkeypatch.setattr(cmd, 'AUTHORED_ANSWERS', {})
        _run()
        assert sorted(Question.objects.values_list('order', flat=True)) == [0, 2]

        monkeypatch.undo()
        _run(fill_missing=True)

        assert sorted(Question.objects.values_list('order', flat=True)) == [0, 1, 2]


PROSE_ANSWER_SLIDE = '''
<div class="module-slide" data-slide="5">
  <h2>Question 5: Explain</h2>
  <div class="question-content"><p>Describe the primary purpose of input().</p></div>
  <div class="question-info"><span>SHORT ANSWER</span><span>2 points</span></div>
</div>
'''


@pytest.mark.django_db
class TestWrittenAnswerQuestions:
    """
    _check_answer grades short_answer by exact string equality against
    correct_answer. The slides carry no model answer, so importing one stored an
    empty string — which marked a blank submission correct and a real answer
    wrong. Graded backwards is worse than absent.
    """

    def test_a_written_answer_question_is_not_imported(self, quiz):
        quiz.content = PROSE_ANSWER_SLIDE
        quiz.save(update_fields=['content'])

        output = _run()

        assert Question.objects.count() == 0
        assert 'cannot be scored' in output
        # Named, so an instructor can rewrite it.
        assert 'Describe the primary purpose' in output

    def test_the_gradeable_questions_beside_it_still_import(self, quiz):
        quiz.content = SLIDE + PROSE_ANSWER_SLIDE
        quiz.save(update_fields=['content'])

        _run()

        assert Question.objects.count() == 1
        assert Question.objects.get().question_type == 'multiple_choice'

    def test_the_scoring_this_prevents(self, quiz):
        # The bug in one assertion: had it been imported with a blank answer,
        # this is what a student would have got.
        from apps.learning.views import QuizViewSet
        stored_blank = Question(question_type='short_answer', correct_answer='')

        check = QuizViewSet()._check_answer
        assert check(stored_blank, '') is True                    # blank -> full marks
        assert check(stored_blank, 'a correct answer') is False   # correct -> zero
