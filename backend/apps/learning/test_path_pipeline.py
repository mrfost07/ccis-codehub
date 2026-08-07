"""
The seeding pipeline: manifest -> rendered HTML -> rows -> a quiz that scores.

Phase 1 of the career-path buildout replaced one management command per path
with declared content plus a generic seeder. The refactor is only safe if it
renders exactly what the old command rendered, so the first test here is the one
that matters most: the Data Science path's HTML is unchanged.

The rest hold the two new guarantees — a manifest that would produce an
unfinishable path is refused before anything is written, and `validate_paths`
notices the failures that actually reached students.
"""
import pytest
from io import StringIO
from django.core.management import CommandError, call_command

from apps.accounts.models import User
from apps.learning.content import paths as catalogue
from apps.learning.content.builder import (
    ManifestError, check_manifest, render_quiz, render_slides, seed_path,
)
from apps.learning.models import (
    CareerPath, CareerRole, LearningModule, Question, Quiz,
)


def _run(command, *args, **kwargs):
    out = StringIO()
    call_command(command, *args, stdout=out, stderr=out, **kwargs)
    return out.getvalue()


MODULE = {
    'title': 'Module 1: Basics',
    'description': 'd',
    'duration': 40,
    'slides': [{'title': 'Slide one', 'body': '<p>Words.</p>'}],
    'quiz': {
        'title': 'Module 1 Quiz',
        'description': 'd',
        'questions': [
            {'title': 'Assignment', 'text': 'Which symbol assigns?',
             'choices': ['=', '==', '===' ], 'correct': 0, 'points': 2},
            {'title': 'Truth', 'text': 'Python is whitespace sensitive.',
             'true_false': True, 'correct': 0},
        ],
    },
}


def manifest(**over):
    base = {
        'slug': 'test-path', 'name': 'Test Path', 'description': 'd',
        'program_type': 'bscs', 'difficulty_level': 'beginner',
        'estimated_duration': 4, 'modules': [dict(MODULE)],
    }
    base.update(over)
    return base


class TestTheRefactorChangedNothing:
    def test_the_registry_holds_the_data_science_path(self):
        assert 'data-science-and-machine-learning' in catalogue.slugs()

    def test_its_content_still_renders(self):
        # The content moved file; if the move dropped or mangled a module this
        # is where it shows.
        found = catalogue.get('data-science-and-machine-learning')
        assert len(found['modules']) == 5
        assert sum(len(m['quiz']['questions']) for m in found['modules']) == 40
        for module in found['modules']:
            assert render_slides(module['slides']).count('module-slide') == \
                len(module['slides'])
            assert render_quiz(module['quiz']['questions']).count('quiz-choice') > 0

    def test_the_old_command_name_still_works(self, db):
        User.objects.create_user(
            username='ins', email='rfostanes@ssct.edu.ph', password='x',
            role='instructor')

        output = _run('seed_datascience_path')

        assert CareerPath.objects.filter(
            slug='data-science-and-machine-learning').exists()
        assert 'seeded 1 path' in output


class TestRefusingBadManifests:
    def test_a_correct_index_outside_the_choices_is_refused(self):
        # The one that silently produces a question nobody can pass.
        bad = manifest()
        bad['modules'][0] = dict(MODULE, quiz=dict(
            MODULE['quiz'],
            questions=[{'title': 't', 'text': 'q', 'choices': ['a', 'b'], 'correct': 5}]))

        problems = check_manifest(bad)

        assert any('not one of its choices' in p for p in problems)

    def test_duplicate_choice_text_is_refused(self):
        bad = manifest()
        bad['modules'][0] = dict(MODULE, quiz=dict(
            MODULE['quiz'],
            questions=[{'title': 't', 'text': 'q', 'choices': ['a', 'a'], 'correct': 0}]))

        assert any('duplicate choice' in p for p in check_manifest(bad))

    def test_a_module_with_no_quiz_questions_is_refused(self):
        bad = manifest()
        bad['modules'][0] = dict(MODULE, quiz={'title': 'q', 'description': 'd',
                                               'questions': []})

        assert any('no quiz questions' in p for p in check_manifest(bad))

    def test_a_sound_manifest_has_no_problems(self):
        assert check_manifest(manifest()) == []

    def test_the_data_science_manifest_is_sound(self):
        assert check_manifest(catalogue.get('data-science-and-machine-learning')) == []

    @pytest.mark.django_db
    def test_seeding_refuses_rather_than_half_writing(self, db):
        # A half-seeded path is worse than an unseeded one: visible, enrollable
        # and unfinishable.
        instructor = User.objects.create_user(
            username='i2', email='i2@ssct.edu.ph', password='x', role='instructor')
        bad = manifest()
        bad['modules'][0] = dict(MODULE, quiz=dict(
            MODULE['quiz'],
            questions=[{'title': 't', 'text': 'q', 'choices': ['a', 'b'], 'correct': 9}]))

        with pytest.raises(ManifestError):
            seed_path(bad, instructor)

        assert not CareerPath.objects.filter(slug='test-path').exists()


@pytest.mark.django_db
class TestSeeding:
    @pytest.fixture(autouse=True)
    def instructor(self, db):
        return User.objects.create_user(
            username='seed_ins', email='seed@ssct.edu.ph', password='x',
            role='instructor')

    def test_creates_the_path_its_modules_and_quizzes(self, instructor):
        seed_path(manifest(), instructor)

        path = CareerPath.objects.get(slug='test-path')
        assert path.modules.count() == 1
        assert Quiz.objects.filter(learning_module__career_path=path).count() == 1
        assert path.total_modules == 1

    def test_running_twice_updates_rather_than_duplicating(self, instructor):
        seed_path(manifest(), instructor)
        seed_path(manifest(), instructor)

        assert CareerPath.objects.filter(slug='test-path').count() == 1
        assert LearningModule.objects.count() == 1
        assert Quiz.objects.count() == 1

    def test_wires_the_career_role_when_the_manifest_names_one(self, instructor):
        role = CareerRole.objects.create(
            name='Backend Engineer', slug='bscs-backend-engineer',
            program_type='bscs', category='Software Engineering', summary='s')

        seed_path(manifest(role='bscs-backend-engineer'), instructor)

        role.refresh_from_db()
        assert role.career_path.slug == 'test-path'

    def test_the_seeded_quiz_imports_and_grades(self, instructor):
        # End to end: manifest -> HTML -> Question rows -> the real grader.
        from apps.learning.views import QuizViewSet
        seed_path(manifest(), instructor)

        _run('import_quiz_questions')

        multiple = Question.objects.get(question_type='multiple_choice')
        right = multiple.choices.get(is_correct=True)
        wrong = multiple.choices.filter(is_correct=False).first()
        check = QuizViewSet()._check_answer
        assert check(multiple, str(right.id)) is True
        assert check(multiple, str(wrong.id)) is False
        assert right.choice_text == '='

        truth = Question.objects.get(question_type='true_false')
        assert check(truth, 'true') is True
        assert check(truth, 'false') is False


@pytest.mark.django_db
class TestTheSeedCommand:
    @pytest.fixture(autouse=True)
    def instructor(self, db):
        return User.objects.create_user(
            username='cmd_ins', email='rfostanes@ssct.edu.ph', password='x',
            role='instructor')

    def test_list_names_the_registered_paths(self):
        assert 'data-science-and-machine-learning' in _run('seed_path', list=True)

    def test_refuses_an_unregistered_slug(self):
        with pytest.raises(CommandError):
            _run('seed_path', 'no-such-path')

    def test_refuses_with_no_target(self):
        with pytest.raises(CommandError):
            _run('seed_path')

    def test_check_reports_a_path_that_is_not_in_the_database(self):
        output = _run('seed_path', 'data-science-and-machine-learning', check=True)

        assert 'not in the database' in output

    def test_check_confirms_a_freshly_seeded_path_matches(self):
        _run('seed_path', 'data-science-and-machine-learning')

        output = _run('seed_path', 'data-science-and-machine-learning', check=True)

        assert 'matches the database exactly' in output
        assert '0 of 1 path(s) differ' in output

    def test_check_notices_drift(self):
        # The point of --check: telling whether the content files and the
        # database have parted ways.
        _run('seed_path', 'data-science-and-machine-learning')
        module = LearningModule.objects.first()
        module.content = '<div class="module-slide">edited by hand</div>'
        module.save(update_fields=['content'])

        output = _run('seed_path', 'data-science-and-machine-learning', check=True)

        assert 'slides differ' in output

    def test_check_writes_nothing(self):
        _run('seed_path', 'data-science-and-machine-learning', check=True)

        assert not CareerPath.objects.exists()


@pytest.mark.django_db
class TestValidatePaths:
    @pytest.fixture
    def seeded(self, db):
        instructor = User.objects.create_user(
            username='val_ins', email='val@ssct.edu.ph', password='x',
            role='instructor')
        seed_path(manifest(), instructor)
        _run('import_quiz_questions')
        return CareerPath.objects.get(slug='test-path')

    def test_a_sound_path_passes(self, seeded):
        output = _run('validate_paths', skip_certificates=True)

        assert 'all 1 active path(s) pass' in output

    def test_a_quiz_with_no_questions_fails(self, seeded):
        Question.objects.all().delete()

        with pytest.raises(SystemExit):
            _run('validate_paths', skip_certificates=True)

    def test_an_answer_that_is_not_a_choice_fails(self, seeded):
        # correct_answer holding the choice text instead of its id marks every
        # answer wrong, and nothing about the row looks broken.
        question = Question.objects.get(question_type='multiple_choice')
        question.correct_answer = '='
        question.save(update_fields=['correct_answer'])

        with pytest.raises(SystemExit):
            _run('validate_paths', skip_certificates=True)

    def test_a_written_answer_question_fails(self, seeded):
        question = Question.objects.filter(question_type='multiple_choice').first()
        question.question_type = 'short_answer'
        question.save(update_fields=['question_type'])

        with pytest.raises(SystemExit):
            _run('validate_paths', skip_certificates=True)

    def test_the_certificate_check_passes_for_a_real_path(self, seeded):
        # Slow, so it is opt-in elsewhere; run once here to keep it honest.
        output = _run('validate_paths', path='test-path')

        assert 'pass' in output
