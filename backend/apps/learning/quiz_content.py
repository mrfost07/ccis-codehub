"""
Read quiz questions out of Quiz.content.

Slide-based quizzes do not store questions relationally - Quiz.questions is
empty for every quiz in this database - so the HTML in Quiz.content is the only
record of what was asked and which option is right. Until now only the browser
could read it, which is why submit_simple had to accept whatever score the
browser claimed.

The markup contract, matching frontend/src/components/QuizViewer.tsx so that
server and client agree on what a quiz says:

    <div class="module-slide" data-slide="N">
      <h2 ...>Question N: Title</h2>
      <div class="question-content"><p>..</p></div>
      <div class="question-info"><span>MULTIPLE CHOICE</span><span>1 point</span></div>
      <div class="quiz-choices">
        <div class="quiz-choice" data-choice-id="1" data-correct="false"> .. A. text ..
        ...

Three details that are easy to get wrong, all of them load-bearing:

  * data-choice-id must precede data-correct on the same tag, because the
    pattern reads them in that order.
  * The label capture stops at the first '<', so a choice wrapped in <code>
    yields empty text. Many hand-authored quizzes do exactly that; their options
    render blank in the browser today. Scoring does not depend on the text, so
    such quizzes still grade correctly here.
  * The question type is sniffed from the slide text. A multiple-choice question
    containing TRUE and FALSE in capitals is read as true/false.

If this file and QuizViewer ever disagree, students see one thing and get graded
on another. Change them together.
"""
import re
from dataclasses import dataclass, field

SLIDE_RE = re.compile(
    r'<div class="module-slide" data-slide="(\d+)">(.*?)(?=<div class="module-slide"|$)',
    re.S,
)
CHOICE_RE = re.compile(
    r'data-choice-id="([^"]*)"[^>]*data-correct="([^"]*)"[^>]*>.*?([A-Z])\.\s*([^<]*)',
    re.S,
)
TITLE_RE = re.compile(r'Question \d+:\s*([^<]+)')
POINTS_RE = re.compile(r'(\d+)\s*points?', re.I)

FREE_TEXT_KINDS = ('short_answer', 'essay', 'enumeration')


@dataclass
class Choice:
    id: str
    is_correct: bool
    text: str = ''


@dataclass
class Question:
    number: int
    title: str
    kind: str
    points: int
    choices: list = field(default_factory=list)

    @property
    def correct_ids(self):
        return {c.id for c in self.choices if c.is_correct}

    @property
    def is_free_text(self):
        return self.kind in FREE_TEXT_KINDS


def _sniff_kind(slide):
    if 'TRUE' in slide and 'FALSE' in slide:
        return 'true_false'
    if 'SHORT ANSWER' in slide:
        return 'short_answer'
    if 'ESSAY' in slide:
        return 'essay'
    if 'ENUMERATION' in slide:
        return 'enumeration'
    return 'multiple_choice'


def parse_questions(content):
    """Questions declared in `content`, in the order they appear."""
    if not content:
        return []

    questions = []
    for index, (_number, slide) in enumerate(SLIDE_RE.findall(content), start=1):
        title_match = TITLE_RE.search(slide)
        points_match = POINTS_RE.search(slide)
        kind = _sniff_kind(slide)

        choices = []
        if kind in ('multiple_choice', 'true_false'):
            choices = [
                Choice(id=cid, is_correct=(flag == 'true'), text=text.strip())
                for cid, flag, _letter, text in CHOICE_RE.findall(slide)
            ]

        questions.append(Question(
            number=index,
            title=title_match.group(1).strip() if title_match else f'Question {index}',
            kind=kind,
            points=int(points_match.group(1)) if points_match else 1,
            choices=choices,
        ))
    return questions


def score_submission(content, answers):
    """
    Grade `answers` against `content`.

    `answers` maps a question number (int or its string form) to the chosen
    choice ids, or to text for a free-text question.

    Returns (percentage, earned, total, detail). Marking mirrors QuizViewer so a
    student's on-screen result matches what is recorded: every correct option
    must be chosen and no incorrect one, and a free-text answer earns its points
    for any non-empty response, since nothing here can mark prose.
    """
    questions = parse_questions(content)
    earned = 0
    total = 0
    detail = []

    for question in questions:
        total += question.points
        raw = answers.get(question.number, answers.get(str(question.number)))

        if question.is_free_text:
            correct = bool(isinstance(raw, str) and raw.strip())
        else:
            chosen = {str(c) for c in (raw if isinstance(raw, (list, tuple, set)) else
                                       ([raw] if raw not in (None, '') else []))}
            expected = question.correct_ids
            # A question with no marked answer cannot be earned. That happens
            # when markup is malformed rather than when a student is wrong, so
            # it is recorded in the detail for whoever has to fix the quiz.
            correct = bool(expected) and chosen == expected

        if correct:
            earned += question.points
        detail.append({
            'number': question.number,
            'title': question.title,
            'kind': question.kind,
            'points': question.points,
            'correct': correct,
            'answerable': question.is_free_text or bool(question.correct_ids),
        })

    percentage = round((earned / total) * 100) if total else 0
    return percentage, earned, total, detail
