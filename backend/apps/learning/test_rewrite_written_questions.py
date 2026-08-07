"""
Rewriting the written-answer slides as multiple choice.

This edits stored quiz content in place, so the risks are the ones that come
with cutting HTML apart: taking the wrong span and destroying a neighbouring
slide, leaving a slide that no longer parses, or writing a question with no
correct answer or more than one.

So the tests here mostly ask the same thing from different angles - after the
rewrite, does the content still parse into exactly the questions it should, and
is each one answerable.
"""
import pytest
from io import StringIO
from django.core.management import call_command

from apps.learning.models import (
    CareerPath, LearningModule, Question, Quiz,
)
from apps.learning.management.commands.import_quiz_questions import (
    parse_slides,
)
from apps.learning.management.commands.rewrite_written_questions import (
    REWRITES, build_slide, rewrite_content,
)


MC_SLIDE = '''
        <div class="module-slide" data-slide="1">
          <h2>Question 1: Assignment</h2>
          <div class="question-content"><p>Which symbol assigns a value?</p></div>
          <div class="question-info"><span>MULTIPLE CHOICE</span><span>1 point</span></div>
          <div class="quiz-choices">
            <div class="quiz-choice" data-choice-id="1" data-correct="true">
              <label><input type="radio"><span>A. =</span></label>
            </div>
            <div class="quiz-choice" data-choice-id="2" data-correct="false">
              <label><input type="radio"><span>B. ==</span></label>
            </div>
          </div>
        </div>
'''

PROSE_SLIDE = '''
        <div class="module-slide" data-slide="2">
          <h2>Question 2: input()</h2>
          <div class="question-content">
            <p>Describe the primary purpose of the input() function in Python.</p>
          </div>
          <div class="question-info"><span>SHORT ANSWER</span><span>2 points</span></div>
          <div style="margin-top: 1rem;">
            <p>ESSAY - Write your answer:</p>
            <textarea rows="4"></textarea>
          </div>
        </div>
'''

SECOND_PROSE_SLIDE = '''
        <div class="module-slide" data-slide="3">
          <h2>Question 3: Concatenation</h2>
          <div class="question-content">
            <p>What is string concatenation, and how is it typically performed in programming?</p>
          </div>
          <div class="question-info"><span>SHORT ANSWER</span><span>2 points</span></div>
          <div style="margin-top: 1rem;">
            <p>ESSAY - Write your answer:</p>
            <textarea rows="4"></textarea>
          </div>
        </div>
'''


class TestRewritingContent:
    def test_the_written_slide_becomes_answerable(self):
        content, done = rewrite_content(PROSE_SLIDE)

        assert done == ['The input() Function']
        question = parse_slides(content)[0]
        assert question['type'] == 'multiple_choice'
        assert len(question['choices']) == 4
        assert sum(c['correct'] for c in question['choices']) == 1

    def test_the_answer_marked_correct_is_the_right_one(self):
        content, _ = rewrite_content(PROSE_SLIDE)

        question = parse_slides(content)[0]
        correct = next(c for c in question['choices'] if c['correct'])
        assert correct['text'].startswith('It reads a line typed by the user')

    def test_it_keeps_the_points_the_question_carried(self):
        # Rewriting must not quietly change what a quiz is out of.
        content, _ = rewrite_content(PROSE_SLIDE)

        assert parse_slides(content)[0]['points'] == 2

    def test_the_slides_around_it_are_untouched(self):
        # The failure mode of splicing by offset: taking too much and losing a
        # neighbour.
        content, _ = rewrite_content(MC_SLIDE + PROSE_SLIDE + MC_SLIDE)

        questions = parse_slides(content)
        assert len(questions) == 3
        assert questions[0]['text'] == 'Which symbol assigns a value?'
        assert questions[2]['text'] == 'Which symbol assigns a value?'
        assert questions[1]['type'] == 'multiple_choice'

    def test_rewrites_several_in_one_pass(self):
        # Replacing one slide shifts every later offset; both must still land.
        content, done = rewrite_content(PROSE_SLIDE + SECOND_PROSE_SLIDE)

        assert len(done) == 2
        questions = parse_slides(content)
        assert len(questions) == 2
        assert all(q['type'] == 'multiple_choice' for q in questions)
        assert all(sum(c['correct'] for c in q['choices']) == 1 for q in questions)

    def test_running_it_again_changes_nothing(self):
        once, _ = rewrite_content(PROSE_SLIDE)

        twice, done = rewrite_content(once)

        assert done == []
        assert twice == once

    def test_leaves_content_it_has_no_rewrite_for(self):
        unknown = PROSE_SLIDE.replace(
            'Describe the primary purpose of the input() function in Python.',
            'Some question nobody has rewritten.')

        content, done = rewrite_content(unknown)

        assert done == []
        assert content == unknown

    def test_every_rewrite_offers_exactly_one_answer(self):
        # A table entry with two correct choices, or none, would make an
        # unanswerable question and nothing else would catch it.
        for key, rewrite in REWRITES.items():
            correct = [c for c in rewrite['choices'] if c[1]]
            assert len(correct) == 1, f'{rewrite["title"]}: {len(correct)} correct'
            assert len(rewrite['choices']) >= 3, rewrite['title']
            texts = [c[0] for c in rewrite['choices']]
            assert len(set(texts)) == len(texts), f'{rewrite["title"]}: duplicate choice'

    def test_every_built_slide_reads_back_as_intended(self):
        for rewrite in REWRITES.values():
            html = build_slide(1, rewrite['title'], rewrite['prompt'], 2,
                               rewrite['choices'])
            parsed = parse_slides(html)
            assert len(parsed) == 1, rewrite['title']
            assert parsed[0]['type'] == 'multiple_choice', rewrite['title']
            assert len(parsed[0]['choices']) == len(rewrite['choices'])
            assert sum(c['correct'] for c in parsed[0]['choices']) == 1


@pytest.fixture
def quiz(db):
    path = CareerPath.objects.create(
        name='PF', slug='pf-rewrite', description='d', program_type='BSCS',
        difficulty_level='beginner', estimated_duration=4)
    module = LearningModule.objects.create(
        career_path=path, title='M', description='d', order=0)
    return Quiz.objects.create(
        learning_module=module, title='Module 5 Quiz', description='d',
        content=MC_SLIDE + PROSE_SLIDE)


def _run(command, **kwargs):
    out = StringIO()
    call_command(command, stdout=out, **kwargs)
    return out.getvalue()


@pytest.mark.django_db
class TestTheCommand:
    def test_dry_run_writes_nothing(self, quiz):
        before = quiz.content

        output = _run('rewrite_written_questions', dry_run=True)

        quiz.refresh_from_db()
        assert quiz.content == before
        assert 'would rewrite 1' in output

    def test_it_saves_the_rewritten_content(self, quiz):
        _run('rewrite_written_questions')

        quiz.refresh_from_db()
        assert 'MULTIPLE CHOICE' in quiz.content
        assert 'ESSAY - Write your answer' not in quiz.content

    def test_the_rewritten_question_then_imports_and_grades(self, quiz):
        # The whole point: a student can answer it and be scored.
        from apps.learning.views import QuizViewSet
        _run('rewrite_written_questions')

        _run('import_quiz_questions', fill_missing=True)

        question = Question.objects.get(question_text__contains='input()')
        assert question.question_type == 'multiple_choice'
        right = question.choices.get(is_correct=True)
        wrong = question.choices.filter(is_correct=False).first()
        check = QuizViewSet()._check_answer
        assert check(question, str(right.id)) is True
        assert check(question, str(wrong.id)) is False
