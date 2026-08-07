"""
The shared module library, and the first path composed from it.

Eighty-one roles overlap heavily, so a module is authored once and named by key
from every path that needs it. That is what makes the buildout tractable — and
it introduces a failure the inline format could not have: a manifest naming a
module that is not there.

Silently skipping an unknown key would seed a shorter path than the manifest
describes, and nothing downstream would notice: the path would simply be missing
a module nobody asked to remove. So resolution raises, and that is pinned here.

The rest is content quality across the whole library, checked in bulk. One
unanswerable question among a hundred is invisible by inspection.
"""
import pytest
from io import StringIO
from django.core.management import call_command

from apps.accounts.models import User
from apps.learning.content import modules as library
from apps.learning.content import paths as catalogue
from apps.learning.content.builder import (
    UnknownModule, check_manifest, check_questions, render_quiz, render_slides,
    resolve_modules,
)
from apps.learning.management.commands.import_quiz_questions import parse_slides
from apps.learning.models import CareerPath, CareerRole, Question


def _run(command, *args, **kwargs):
    out = StringIO()
    call_command(command, *args, stdout=out, stderr=out, **kwargs)
    return out.getvalue()


class TestResolvingModules:
    def test_a_key_resolves_to_its_definition(self):
        resolved = resolve_modules({'modules': ['core.version_control']})

        assert resolved[0]['title'] == 'Version Control with Git'

    def test_an_unknown_key_raises_rather_than_being_skipped(self):
        # Skipping would seed a shorter path than the manifest describes, and
        # nothing downstream would notice.
        with pytest.raises(UnknownModule):
            resolve_modules({'slug': 'p', 'modules': ['core.does_not_exist']})

    def test_an_inline_module_still_works(self):
        # Quiz packs and older manifests declare modules in place.
        inline = {'title': 'Inline', 'slides': [], 'quiz': {'questions': []}}

        assert resolve_modules({'modules': [inline]}) == [inline]

    def test_keys_and_inline_modules_can_be_mixed(self):
        inline = {'title': 'Inline', 'slides': [], 'quiz': {'questions': []}}

        resolved = resolve_modules({'modules': ['core.version_control', inline]})

        assert [m['title'] for m in resolved] == ['Version Control with Git', 'Inline']

    def test_the_same_module_can_serve_two_paths(self):
        # The whole point of the library.
        first = resolve_modules({'modules': ['core.http_and_apis']})[0]
        second = resolve_modules({'modules': ['core.http_and_apis']})[0]

        assert first is second


class TestEveryModuleInTheLibrary:
    def test_every_module_is_shaped_correctly(self):
        for key in library.keys():
            module = library.get(key)
            for field in ('title', 'description', 'duration', 'slides', 'quiz'):
                assert module.get(field), f'{key}: missing {field}'
            assert module['quiz'].get('questions'), f'{key}: no questions'

    def test_every_question_in_the_library_is_answerable(self):
        problems = []
        for key in library.keys():
            module = library.get(key)
            problems.extend(check_questions(module['quiz']['questions'], key))
        assert problems == []

    def test_every_quiz_survives_the_round_trip_to_the_parser(self):
        # Rendered HTML is read back by import_quiz_questions; a question that
        # renders but does not parse becomes a quiz with missing questions.
        for key in library.keys():
            questions = library.get(key)['quiz']['questions']
            parsed = parse_slides(render_quiz(questions))
            assert len(parsed) == len(questions), key
            for got, source in zip(parsed, questions):
                correct = [c for c in got['choices'] if c['correct']]
                assert len(correct) == 1, f'{key}: {source["title"]}'
                expected = (['True', 'False'] if source.get('true_false')
                            else source['choices'])[source['correct']]
                assert correct[0]['text'] == expected, f'{key}: {source["title"]}'

    def test_every_slide_renders(self):
        for key in library.keys():
            slides = library.get(key)['slides']
            rendered = render_slides(slides)
            assert rendered.count('module-slide') == len(slides), key
            assert len(slides) >= 4, f'{key}: only {len(slides)} slides'

    def test_no_choice_label_contains_markup(self):
        # QuizViewer captures a label with [^<]+, so a tag renders it blank.
        for key in library.keys():
            for question in library.get(key)['quiz']['questions']:
                for choice in question.get('choices', []):
                    assert '<' not in choice, f'{key}: {choice}'

    def test_no_multiple_choice_question_reads_as_true_false(self):
        for key in library.keys():
            for question in library.get(key)['quiz']['questions']:
                if question.get('true_false'):
                    continue
                body = f'{question["text"]} {" ".join(question["choices"])}'
                assert not ('TRUE' in body and 'FALSE' in body), \
                    f'{key}: {question["title"]}'


class TestTheComposedPath:
    def test_backend_engineer_is_registered_and_sound(self):
        manifest = catalogue.get('backend-engineer')

        assert manifest is not None
        assert check_manifest(manifest) == []

    def test_it_is_composed_mostly_from_shared_modules(self):
        # Four of five shared is the argument for the library: the next
        # engineering path costs a capstone, not five modules.
        manifest = catalogue.get('backend-engineer')

        shared = [m for m in manifest['modules']
                  if isinstance(m, str) and not m.startswith('capstones.')]
        assert len(shared) == 4
        assert len(manifest['modules']) == 5

    @pytest.mark.django_db
    def test_it_seeds_imports_and_grades(self, db):
        from apps.learning.views import QuizViewSet
        User.objects.create_user(
            username='be_ins', email='rfostanes@ssct.edu.ph', password='x',
            role='instructor')
        role = CareerRole.objects.create(
            name='Backend Engineer', slug='bscs-backend-engineer',
            program_type='bscs', category='Software Engineering', summary='s')

        _run('seed_path', 'backend-engineer')
        _run('import_quiz_questions', fill_missing=True)

        path = CareerPath.objects.get(slug='backend-engineer')
        assert path.modules.count() == 5
        # The career map should now lead to it.
        role.refresh_from_db()
        assert role.career_path == path

        questions = Question.objects.filter(
            quiz__learning_module__career_path=path).prefetch_related('choices')
        assert questions.count() == 44

        check = QuizViewSet()._check_answer
        for question in questions:
            if question.question_type == 'true_false':
                right = question.correct_answer
                wrong = 'false' if right == 'true' else 'true'
            else:
                right = str(question.correct_answer)
                wrong = str(question.choices.exclude(id=right).first().id)
            assert check(question, right) is True, question.question_text[:50]
            assert check(question, wrong) is False, question.question_text[:50]

    @pytest.mark.django_db
    def test_it_then_passes_validation(self, db):
        User.objects.create_user(
            username='be_ins2', email='rfostanes@ssct.edu.ph', password='x',
            role='instructor')
        _run('seed_path', 'backend-engineer')
        _run('import_quiz_questions', fill_missing=True)

        output = _run('validate_paths', path='backend-engineer',
                      skip_certificates=True)

        assert 'pass' in output


class TestAnswersAreDistributed:
    """
    Every multiple-choice answer sitting at option A makes a quiz worthless:
    a student notices in one sitting and scores full marks without reading.

    All 115 questions authored for the library and the quiz packs were written
    with the answer first, and shipped that way, before anyone noticed. This is
    the check that would have caught it — bulk, not per-question, because no
    individual question is wrong.
    """

    def bodies(self):
        from apps.learning.content import quizzes as packs

        for key in library.keys():
            yield key, library.get(key)['quiz']['questions']
        for slug in packs.slugs():
            for spec in packs.get(slug):
                yield f'{slug}/{spec["title"]}', spec['questions']

    def test_no_body_of_content_puts_every_answer_in_the_same_place(self):
        import collections

        pooled = collections.Counter()
        pooled_total = 0
        for where, questions in self.bodies():
            positions = [q['correct'] for q in questions if not q.get('true_false')]
            if not positions:
                continue
            pooled.update(positions)
            pooled_total += len(positions)
            # Per quiz, allow some clustering — a five-question quiz can
            # legitimately land two or three in the same place.
            if len(positions) >= 8:
                top = collections.Counter(positions).most_common(1)[0][1]
                assert top / len(positions) <= 0.6, \
                    f'{where}: {top} of {len(positions)} answers in one position'

        # Across everything, the distribution must be broad.
        assert pooled_total >= 100
        top = pooled.most_common(1)[0][1]
        assert top / pooled_total <= 0.45, \
            f'{top} of {pooled_total} answers share a position: {dict(pooled)}'
        assert len(pooled) >= 3, f'answers only ever appear at {sorted(pooled)}'
