"""
Rendering and seeding for declared path content.

One path used to mean one 1,465-line management command. Eighty-one of those is
not authorable, so the machinery lives here and a path is a manifest: metadata
plus an ordered list of module definitions.

The HTML contracts below were reverse-engineered from the code that consumes
them, and the render functions are unchanged from the ones that produced the
Data Science path already in the database.

  Module slides - ModuleLearningEnhanced renders module.content directly and
  SlideViewer splits on the same markers:
      <div class="module-slide" data-slide="N">
        <h2 class="slide-title">..</h2>
        <div class="slide-content">..</div>
        <hr class="slide-separator" />
      </div>

  Quiz questions - QuizViewer.parseQuestions does the grading, so its regexes
  are the specification:
      slides   /<div class="module-slide" data-slide="(\\d+)">([\\s\\S]*?)(?=<div class="module-slide"|$)/
      choices  /data-choice-id="([^"]*)"[^>]*data-correct="([^"]*)"[^>]*>[\\s\\S]*?([A-Z])\\.\\s*([^<]+)/

  Three consequences that are easy to get wrong:
    1. data-choice-id must appear BEFORE data-correct on the same tag.
    2. Choice label text must be plain - the final capture is [^<]+, so an
       inline <code> tag truncates the text to nothing.
    3. Question type is sniffed from the slide text: uppercase TRUE and FALSE
       both present means true/false. So a multiple-choice question must never
       contain both words in caps, and a true/false question must.

`import_quiz_questions` then reads the rendered quiz HTML back into Question
rows, which is what the student page actually grades against. Seeding a path and
not running the import leaves a quiz that renders but cannot be scored.
"""
import html

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

CHOICE_LETTERS = 'ABCDEFGH'

# Inline styles are copied from the quizzes the instructor dashboard already
# produces, so seeded quizzes look identical to hand-made ones.
CHOICE_STYLE = (
    'padding: 0.75rem; margin: 0.5rem 0; background: rgba(255,255,255,0.05); '
    'border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; cursor: pointer;'
)
LABEL_STYLE = 'display: flex; align-items: center; cursor: pointer;'
RADIO_STYLE = 'margin-right: 0.75rem; width: 1.25rem; height: 1.25rem;'
H2_STYLE = 'color: #60a5fa; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;'
INFO_STYLE = (
    'display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: #94a3b8;'
)


def render_slides(slides):
    """Module body: one module-slide block per slide."""
    blocks = []
    for index, slide in enumerate(slides, start=1):
        body = slide['body']
        if slide.get('code'):
            body += (
                '<pre class="ql-syntax" spellcheck="false">'
                f'{html.escape(slide["code"])}\n</pre>'
            )
        blocks.append(
            f'<div class="module-slide" data-slide="{index}">\n'
            f'        <h2 class="slide-title">{slide["title"]}</h2>\n'
            f'        <div class="slide-content">\n'
            f'          {body}\n'
            f'        </div>\n'
            f'        <hr class="slide-separator" />\n'
            f'      </div>'
        )
    return '\n\n'.join(blocks)


def render_quiz(questions):
    """Quiz body: one module-slide block per question, gradable by QuizViewer."""
    blocks = []
    for number, question in enumerate(questions, start=1):
        is_true_false = question.get('true_false', False)
        choices = ['True', 'False'] if is_true_false else question['choices']
        kind = 'TRUE / FALSE' if is_true_false else 'MULTIPLE CHOICE'
        points = question.get('points', 1)
        unit = 'point' if points == 1 else 'points'

        rendered_choices = []
        for position, text in enumerate(choices):
            correct = 'true' if position == question['correct'] else 'false'
            rendered_choices.append(
                f'            <div class="quiz-choice" style="{CHOICE_STYLE}" '
                f'data-choice-id="{position + 1}" data-correct="{correct}">\n'
                f'              <label style="{LABEL_STYLE}">\n'
                f'                <input type="radio" name="question-{number}" '
                f'value="{position + 1}" style="{RADIO_STYLE}">\n'
                f'                <span style="font-size: 1rem;">'
                f'{CHOICE_LETTERS[position]}. {text}</span>\n'
                f'              </label>\n'
                f'            </div>'
            )

        blocks.append(
            f'<div class="module-slide" data-slide="{number}">\n'
            f'          <h2 style="{H2_STYLE}">\n'
            f'            Question {number}: {question["title"]}\n'
            f'          </h2>\n'
            f'          <div class="question-content" style="margin-bottom: 1.5rem;">\n'
            f'            <p>{question["text"]}</p>\n'
            f'          </div>\n'
            f'          <div class="question-info" style="{INFO_STYLE}">\n'
            f'            <span>{kind}</span>\n'
            f'            <span>{points} {unit}</span>\n'
            f'          </div>\n'
            f'          <div class="quiz-choices" style="margin-top: 1rem;">\n'
            + '\n'.join(rendered_choices) + '\n'
            f'          </div>\n'
            f'          <hr class="slide-separator" />\n'
            f'        </div>'
        )
    return '\n\n'.join(blocks)


class ManifestError(ValueError):
    """A manifest that would produce a path nobody can complete."""


def check_questions(questions, where):
    """Problems in one quiz's questions. Empty list if they are sound."""
    problems = []
    for number, question in enumerate(questions, start=1):
        at = f'{where} Q{number}'
        choices = ['True', 'False'] if question.get('true_false') else \
            question.get('choices') or []
        if len(choices) < 2:
            problems.append(f'{at}: fewer than two choices')
        correct = question.get('correct')
        if not isinstance(correct, int) or not 0 <= correct < len(choices):
            # The one that silently produces an unpassable question.
            problems.append(f'{at}: correct index {correct!r} is not one of its choices')
        if len(set(choices)) != len(choices):
            problems.append(f'{at}: duplicate choice text')
        if any('<' in str(c) for c in choices):
            # QuizViewer's final capture is [^<]+, so a tag truncates the label
            # to nothing and the choice renders blank.
            problems.append(f'{at}: markup in a choice label')
        if not question.get('text'):
            problems.append(f'{at}: no question text')
    return problems


def check_manifest(manifest):
    """Problems that must not reach the database. Empty list if it is sound.

    Checked before writing rather than after, because a half-seeded path is
    worse than an unseeded one: it is visible, enrollable and unfinishable.
    """
    problems = []
    for field in ('name', 'slug', 'description', 'program_type',
                  'difficulty_level', 'estimated_duration', 'modules'):
        if not manifest.get(field):
            problems.append(f'missing {field}')

    for index, module in enumerate(manifest.get('modules') or [], start=1):
        where = f'module {index} ({module.get("title", "untitled")[:40]})'
        if not module.get('slides'):
            problems.append(f'{where}: no slides')
        quiz = module.get('quiz')
        if not quiz or not quiz.get('questions'):
            problems.append(f'{where}: no quiz questions')
            continue
        problems.extend(check_questions(quiz['questions'], where))
    return problems


def render_path(manifest):
    """The HTML each module and quiz would be given, without touching the DB."""
    rendered = []
    for module in manifest['modules']:
        rendered.append({
            'title': module['title'],
            'content': render_slides(module['slides']),
            'quiz_title': module['quiz']['title'],
            'quiz_content': render_quiz(module['quiz']['questions']),
        })
    return rendered


@transaction.atomic
def seed_path(manifest, instructor, status='approved'):
    """Create or update the path, its modules and their quizzes.

    Idempotent: matched on the path slug and each module's order, so re-running
    updates rows rather than duplicating them. Returns (path, created).
    """
    from apps.learning.models import CareerPath, LearningModule, Quiz

    problems = check_manifest(manifest)
    if problems:
        raise ManifestError('; '.join(problems))

    modules = manifest['modules']
    path, created = CareerPath.objects.update_or_create(
        slug=manifest.get('slug') or slugify(manifest['name']),
        defaults={
            'name': manifest['name'],
            'description': manifest['description'],
            'program_type': manifest['program_type'],
            'difficulty_level': manifest['difficulty_level'],
            'estimated_duration': manifest['estimated_duration'],
            'points_reward': manifest.get('points_reward', 100),
            'skills_granted': manifest.get('skills_granted', []),
            'icon': manifest.get('icon', ''),
            'color': manifest.get('color', '#6366f1'),
            'total_modules': len(modules),
            'max_modules': len(modules),
            'instructor': instructor,
            'approval_status': status,
            'approved_by': instructor if status == 'approved' else None,
            'approved_at': timezone.now() if status == 'approved' else None,
            'is_active': True,
            'is_featured': manifest.get('is_featured', False),
        },
    )

    for order, spec in enumerate(modules):
        module, _ = LearningModule.objects.update_or_create(
            career_path=path, order=order,
            defaults={
                'title': spec['title'],
                'description': spec['description'],
                'module_type': 'text',
                'difficulty_level': spec.get('difficulty', 'beginner'),
                'content': render_slides(spec['slides']),
                'duration_minutes': spec['duration'],
                'points_reward': spec.get('points', 20),
                'skills_taught': spec.get('skills', []),
                'is_locked': False,
            },
        )
        quiz_spec = spec['quiz']
        Quiz.objects.update_or_create(
            learning_module=module, title=quiz_spec['title'],
            defaults={
                'description': quiz_spec['description'],
                'content': render_quiz(quiz_spec['questions']),
                'time_limit_minutes': quiz_spec.get('time_limit', 15),
                'passing_score': quiz_spec.get('passing_score', 70),
                'max_attempts': quiz_spec.get('max_attempts', 3),
                'randomize_questions': False,
            },
        )

    # Wire the career map, if this path is the route to a role.
    role_slug = manifest.get('role')
    if role_slug:
        from apps.learning.models import CareerRole
        CareerRole.objects.filter(slug=role_slug).update(career_path=path)

    return path, created
