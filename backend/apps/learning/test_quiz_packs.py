"""
Quiz packs: quizzes for the five paths that teach but cannot assess.

The packs are content, so most of what can go wrong is content going wrong —
an answer index that points nowhere, two identical options, a label with markup
that renders blank. Those are checked across every question in every pack here,
because one bad question in eighty-five is invisible by inspection and produces
a quiz nobody can pass.

The rest holds the mechanism: a pack attaches quizzes to modules that already
exist without touching their content, and refuses rather than half-applying.
"""
import pytest
from io import StringIO
from django.core.management import CommandError, call_command

from apps.accounts.models import User
from apps.learning.content import quizzes as catalogue
from apps.learning.content.builder import check_questions, render_quiz
from apps.learning.management.commands.import_quiz_questions import parse_slides
from apps.learning.models import CareerPath, LearningModule, Question, Quiz


def _run(command, *args, **kwargs):
    out = StringIO()
    call_command(command, *args, stdout=out, stderr=out, **kwargs)
    return out.getvalue()


class TestEveryQuestionInEveryPack:
    """One unanswerable question in eighty-five is invisible by eye."""

    def test_all_questions_are_sound(self):
        problems = []
        for slug in catalogue.slugs():
            for spec in catalogue.get(slug):
                problems.extend(
                    check_questions(spec['questions'], f'{slug} {spec["title"]}'))
        assert problems == []

    def test_every_question_survives_the_round_trip_to_the_parser(self):
        # Rendered HTML is read back by import_quiz_questions. A question that
        # renders but does not parse becomes a quiz with missing questions.
        for slug in catalogue.slugs():
            for spec in catalogue.get(slug):
                parsed = parse_slides(render_quiz(spec['questions']))
                assert len(parsed) == len(spec['questions']), \
                    f'{slug} {spec["title"]}: {len(parsed)} parsed of {len(spec["questions"])}'
                for question, source in zip(parsed, spec['questions']):
                    correct = [c for c in question['choices'] if c['correct']]
                    assert len(correct) == 1, f'{slug}: {source["title"]}'
                    expected = (['True', 'False'] if source.get('true_false')
                                else source['choices'])[source['correct']]
                    assert correct[0]['text'] == expected, \
                        f'{slug} {source["title"]}: marked "{correct[0]["text"]}"'

    def test_no_choice_label_would_render_blank(self):
        # QuizViewer captures a label with [^<]+, so a tag truncates it away.
        for slug in catalogue.slugs():
            for spec in catalogue.get(slug):
                for question in spec['questions']:
                    for choice in question.get('choices', []):
                        assert '<' not in choice, f'{slug}: {choice}'

    def test_multiple_choice_questions_do_not_read_as_true_false(self):
        # Type is sniffed from the slide: uppercase TRUE and FALSE both present
        # means true/false, and a multiple-choice question would be regraded.
        for slug in catalogue.slugs():
            for spec in catalogue.get(slug):
                for question in spec['questions']:
                    if question.get('true_false'):
                        continue
                    body = f'{question["text"]} {" ".join(question["choices"])}'
                    assert not ('TRUE' in body and 'FALSE' in body), \
                        f'{slug}: {question["title"]}'

    def test_the_packs_cover_the_paths_that_could_not_assess(self):
        assert set(catalogue.slugs()) == {
            'cloud-computing-fundamentals-a-practical-guide-2r6',
            'comprehensive-data-structures-for-college-stude-ag',
            'comprehensive-web-development-course-vgn',
            'fundamentals-of-sql-ikn',
            'hosting-a-website-on-aws-ec2-qkv',
        }

    def test_question_counts_are_proportionate_to_the_modules(self):
        # Five for a thirty-minute module, eight for a long one. A twenty
        # question exam on a half-hour lesson tests stamina.
        for slug in catalogue.slugs():
            for spec in catalogue.get(slug):
                assert 5 <= len(spec['questions']) <= 10, \
                    f'{slug} {spec["title"]}: {len(spec["questions"])}'


@pytest.fixture
def sql_path(db):
    """The Fundamentals of SQL path, with its real module titles."""
    path = CareerPath.objects.create(
        name='Fundamentals of SQL', slug='fundamentals-of-sql-ikn',
        description='d', program_type='bscs', difficulty_level='beginner',
        estimated_duration=3, is_active=True)
    for order, title in enumerate((
            'Module 1: Introduction to SQL and Databases',
            'Module 2: Querying Data with SQL',
            'Module 3: Manipulating Data with SQL')):
        LearningModule.objects.create(
            career_path=path, title=title, description='d', order=order,
            content='<div class="module-slide"><h2>Teaching</h2></div>')
    return path


@pytest.mark.django_db
class TestApplyingAPack:
    def test_writes_a_quiz_for_each_module(self, sql_path):
        _run('seed_quizzes', 'fundamentals-of-sql-ikn')

        assert Quiz.objects.filter(
            learning_module__career_path=sql_path).count() == 3

    def test_does_not_touch_the_module_content(self, sql_path):
        # The reason packs exist: the teaching material was authored elsewhere
        # and nobody asked for it to change.
        before = {m.id: m.content for m in sql_path.modules.all()}

        _run('seed_quizzes', 'fundamentals-of-sql-ikn')

        after = {m.id: m.content for m in sql_path.modules.all()}
        assert after == before

    def test_running_twice_updates_rather_than_duplicating(self, sql_path):
        _run('seed_quizzes', 'fundamentals-of-sql-ikn')
        _run('seed_quizzes', 'fundamentals-of-sql-ikn')

        assert Quiz.objects.count() == 3

    def test_dry_run_writes_nothing(self, sql_path):
        output = _run('seed_quizzes', 'fundamentals-of-sql-ikn', dry_run=True)

        assert Quiz.objects.count() == 0
        assert 'would write 3' in output

    def test_refuses_when_a_module_is_missing_and_writes_none(self, sql_path):
        # Half a pack applied leaves a path that looks assessable and is not.
        sql_path.modules.filter(order=1).delete()

        with pytest.raises(CommandError):
            _run('seed_quizzes', 'fundamentals-of-sql-ikn')

        assert Quiz.objects.count() == 0

    def test_refuses_an_unknown_slug(self, sql_path):
        with pytest.raises(CommandError):
            _run('seed_quizzes', 'not-a-path')

    def test_refuses_with_no_target(self, sql_path):
        with pytest.raises(CommandError):
            _run('seed_quizzes')

    def test_the_seeded_quizzes_import_and_grade(self, sql_path):
        # The whole point: a student can answer these and be scored.
        from apps.learning.views import QuizViewSet
        _run('seed_quizzes', 'fundamentals-of-sql-ikn')

        _run('import_quiz_questions', fill_missing=True)

        questions = Question.objects.filter(
            quiz__learning_module__career_path=sql_path)
        assert questions.count() == 15

        check = QuizViewSet()._check_answer
        for question in questions.prefetch_related('choices'):
            if question.question_type == 'true_false':
                right = question.correct_answer
                wrong = 'false' if right == 'true' else 'true'
            else:
                right = str(question.correct_answer)
                wrong = str(question.choices.exclude(id=right).first().id)
            assert check(question, right) is True, question.question_text[:50]
            assert check(question, wrong) is False, question.question_text[:50]

    def test_the_path_then_passes_validation(self, sql_path):
        _run('seed_quizzes', 'fundamentals-of-sql-ikn')
        _run('import_quiz_questions', fill_missing=True)

        output = _run('validate_paths', path='fundamentals-of-sql-ikn',
                      skip_certificates=True)

        assert 'pass' in output

    def test_the_answer_is_the_one_the_pack_declared(self, sql_path):
        # Marking the wrong option correct is the failure nothing else catches:
        # the quiz works, and everybody who knows the answer fails.
        _run('seed_quizzes', 'fundamentals-of-sql-ikn')
        _run('import_quiz_questions', fill_missing=True)

        question = Question.objects.get(question_text__contains='extracts data')
        assert question.choices.get(is_correct=True).choice_text == 'SELECT'
