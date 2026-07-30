"""
Grading must happen on the server.

submit_simple used to do this:

    score = request.data.get('score', 0)

and the browser never sent its answers at all - only the result it had computed
itself. So a student could post any grade, and the server had nothing to check it
against even in principle. Req 7 of the remediation spec closed this on the
`submit` endpoint but not on this one, which is the endpoint the module quiz flow
actually uses.

These tests assert the two properties that matter: a claimed score is ignored,
and the recorded score matches the answers.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import CareerPath, LearningModule, Quiz, QuizAttempt
from apps.learning.quiz_content import parse_questions, score_submission

# Two questions worth 1 point each: correct choices are 2 and 1 respectively.
CONTENT = '''<div class="module-slide" data-slide="1">
  <h2>Question 1: Capital of France</h2>
  <div class="question-content"><p>Which city is the capital of France?</p></div>
  <div class="question-info"><span>MULTIPLE CHOICE</span><span>1 point</span></div>
  <div class="quiz-choices">
    <div class="quiz-choice" data-choice-id="1" data-correct="false"><span>A. Berlin</span></div>
    <div class="quiz-choice" data-choice-id="2" data-correct="true"><span>B. Paris</span></div>
    <div class="quiz-choice" data-choice-id="3" data-correct="false"><span>C. Madrid</span></div>
  </div>
  <hr class="slide-separator" />
</div>

<div class="module-slide" data-slide="2">
  <h2>Question 2: Water Boils</h2>
  <div class="question-content"><p>Water boils at 100 degrees Celsius at sea level.</p></div>
  <div class="question-info"><span>TRUE / FALSE</span><span>1 point</span></div>
  <div class="quiz-choices">
    <div class="quiz-choice" data-choice-id="1" data-correct="true"><span>A. True</span></div>
    <div class="quiz-choice" data-choice-id="2" data-correct="false"><span>B. False</span></div>
  </div>
  <hr class="slide-separator" />
</div>'''


class ParsingQuizContent(TestCase):
    def test_reads_both_questions_with_types_and_answers(self):
        questions = parse_questions(CONTENT)

        self.assertEqual(len(questions), 2)
        self.assertEqual(questions[0].kind, 'multiple_choice')
        self.assertEqual(questions[0].correct_ids, {'2'})
        self.assertEqual(questions[1].kind, 'true_false')
        self.assertEqual(questions[1].correct_ids, {'1'})
        self.assertEqual([q.points for q in questions], [1, 1])

    def test_empty_content_yields_no_questions(self):
        self.assertEqual(parse_questions(''), [])
        self.assertEqual(parse_questions(None), [])

    def test_choices_wrapped_in_code_still_grade(self):
        # Many hand-authored quizzes wrap options in <code>, which truncates the
        # label text to nothing. Scoring must not depend on the text.
        content = CONTENT.replace('<span>B. Paris</span>', '<span>B. <code>Paris</code></span>')
        questions = parse_questions(content)
        self.assertEqual(questions[0].correct_ids, {'2'})


class ScoringSubmissions(TestCase):
    def test_all_correct_scores_full_marks(self):
        percentage, earned, total, _ = score_submission(CONTENT, {1: ['2'], 2: ['1']})
        self.assertEqual((percentage, earned, total), (100, 2, 2))

    def test_all_wrong_scores_zero(self):
        percentage, earned, _total, _ = score_submission(CONTENT, {1: ['1'], 2: ['2']})
        self.assertEqual((percentage, earned), (0, 0))

    def test_partial_credit_per_question(self):
        percentage, earned, total, _ = score_submission(CONTENT, {1: ['2'], 2: ['2']})
        self.assertEqual((percentage, earned, total), (50, 1, 2))

    def test_string_question_keys_work(self):
        # JSON object keys arrive as strings.
        percentage, _e, _t, _d = score_submission(CONTENT, {'1': ['2'], '2': ['1']})
        self.assertEqual(percentage, 100)

    def test_a_bare_value_counts_the_same_as_a_list(self):
        percentage, _e, _t, _d = score_submission(CONTENT, {1: '2', 2: '1'})
        self.assertEqual(percentage, 100)

    def test_no_answers_scores_zero_rather_than_crashing(self):
        percentage, earned, total, _ = score_submission(CONTENT, {})
        self.assertEqual((percentage, earned, total), (0, 0, 2))

    def test_selecting_extra_choices_is_not_correct(self):
        percentage, _e, _t, _d = score_submission(CONTENT, {1: ['1', '2'], 2: ['1']})
        self.assertEqual(percentage, 50, 'picking every option should not earn the mark')

    def test_a_question_with_no_marked_answer_is_reported_as_ungradable(self):
        broken = CONTENT.replace('data-correct="true"', 'data-correct="false"')
        _p, _e, _t, detail = score_submission(broken, {1: ['2'], 2: ['1']})
        self.assertEqual([q['answerable'] for q in detail], [False, False])


class SubmitSimpleEndpoint(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='quiz_stu', email='qs@ssct.edu.ph', password='x', role='student',
        )
        path = CareerPath.objects.create(
            name='Scoring Path', slug='scoring-path', description='d',
            program_type='bscs', difficulty_level='beginner', estimated_duration=4,
        )
        module = LearningModule.objects.create(
            career_path=path, title='M1', description='d', order=0,
        )
        self.quiz = Quiz.objects.create(
            learning_module=module, title='Scoring Quiz', description='d',
            content=CONTENT, passing_score=70, max_attempts=5,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.student)
        self.url = f'/api/learning/quizzes/{self.quiz.id}/submit_simple/'

    def test_a_claimed_score_is_ignored(self):
        # The whole point. A student posting 100 with wrong answers gets 0.
        response = self.client.post(
            self.url,
            {'answers': {'1': ['1'], '2': ['2']}, 'score': 100, 'points_earned': 2},
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['score'], 0)
        self.assertFalse(response.data['passed'])
        self.assertEqual(QuizAttempt.objects.get(user=self.student).score, 0)

    def test_correct_answers_are_graded_and_recorded(self):
        response = self.client.post(
            self.url, {'answers': {'1': ['2'], '2': ['1']}}, format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['score'], 100)
        self.assertTrue(response.data['passed'])
        self.assertEqual(QuizAttempt.objects.get(user=self.student).score, 100)

    def test_a_submission_without_answers_is_rejected(self):
        # An old cached bundle posts only a score. Grading it on its own word is
        # exactly the hole being closed, so refuse instead.
        response = self.client.post(
            self.url, {'score': 95, 'points_earned': 2, 'total_points': 2}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('reload', response.data['detail'].lower())
        self.assertFalse(QuizAttempt.objects.filter(user=self.student).exists())

    def test_an_ungradable_quiz_reports_a_conflict_rather_than_zero(self):
        # Otherwise a broken answer key looks like the student failing.
        self.quiz.content = CONTENT.replace('data-correct="true"', 'data-correct="false"')
        self.quiz.save(update_fields=['content'])

        response = self.client.post(
            self.url, {'answers': {'1': ['2'], '2': ['1']}}, format='json',
        )
        self.assertEqual(response.status_code, 409, response.data)
        self.assertEqual(response.data['ungradable_questions'], [1, 2])
        self.assertFalse(QuizAttempt.objects.filter(user=self.student).exists())

    def test_the_attempt_limit_still_applies(self):
        for _ in range(self.quiz.max_attempts):
            self.client.post(self.url, {'answers': {'1': ['2'], '2': ['1']}}, format='json')

        response = self.client.post(
            self.url, {'answers': {'1': ['2'], '2': ['1']}}, format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Maximum attempts', response.data['detail'])
