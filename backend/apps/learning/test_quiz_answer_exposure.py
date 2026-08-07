"""
The quiz answer key must not be readable by the people taking the quiz.

QuestionSerializer and QuestionChoiceSerializer were `fields = '__all__'`, so
`/api/learning/quizzes/{id}/` returned `correct_answer` on every question and
`is_correct` on every choice. Quiz retrieve is IsAuthenticatedOrReadOnly, so
that went out to anonymous callers too - the answer key to every quiz on the
platform, one unauthenticated request away.

It went unnoticed because the Question table was empty: there were no questions
to leak. Importing the seeded quiz slides filled it, and the hole opened.

Instructors do need the answers, to author with. So the split is by who is
asking, and these tests hold both halves: nothing for a student, everything for
an instructor, and grading still works.
"""
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.learning.models import (
    CareerPath, LearningModule, Question, QuestionChoice, Quiz,
)


class QuizAnswerExposure(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username='q_stu', email='qstu@ssct.edu.ph', password='x', role='student')
        self.instructor = User.objects.create_user(
            username='q_ins', email='qins@ssct.edu.ph', password='x', role='instructor')
        self.admin = User.objects.create_user(
            username='q_adm', email='qadm@ssct.edu.ph', password='x', role='admin')

        path = CareerPath.objects.create(
            name='Programming Fundamentals', slug='pf-leak', description='d',
            program_type='bscs', difficulty_level='beginner', estimated_duration=6,
        )
        module = LearningModule.objects.create(
            career_path=path, title='Module 1', description='d', order=0)
        self.quiz = Quiz.objects.create(
            learning_module=module, title='Module 1 Quiz', description='d',
            passing_score=50,
        )
        self.question = Question.objects.create(
            quiz=self.quiz, question_text='Which keyword defines a function?',
            question_type='multiple_choice', correct_answer='', points=2, order=0,
        )
        self.wrong = QuestionChoice.objects.create(
            question=self.question, choice_text='function', is_correct=False, order=0)
        self.right = QuestionChoice.objects.create(
            question=self.question, choice_text='def', is_correct=True, order=1)
        self.question.correct_answer = str(self.right.id)
        self.question.save(update_fields=['correct_answer'])

        self.detail = reverse('quiz-detail', args=[self.quiz.id])

    def questions_in(self, payload):
        return payload['questions']

    # -- what a student is allowed to see -----------------------------------

    def test_a_student_is_not_told_the_answer(self):
        self.client.force_authenticate(self.student)

        question = self.questions_in(self.client.get(self.detail).data)[0]

        self.assertNotIn('correct_answer', question)
        for choice in question['choices']:
            self.assertNotIn('is_correct', choice)

    def test_an_anonymous_caller_is_not_told_the_answer(self):
        # Quiz retrieve is IsAuthenticatedOrReadOnly. No login needed at all.
        question = self.questions_in(self.client.get(self.detail).data)[0]

        self.assertNotIn('correct_answer', question)
        for choice in question['choices']:
            self.assertNotIn('is_correct', choice)

    def test_the_explanation_is_not_handed_over_before_answering(self):
        # It names the answer in prose often enough to be the same leak.
        self.client.force_authenticate(self.student)

        question = self.questions_in(self.client.get(self.detail).data)[0]

        self.assertNotIn('explanation', question)

    def test_the_student_still_gets_what_taking_the_quiz_needs(self):
        # Stripping too much would leave an unanswerable quiz, which looks the
        # same from here as an empty one.
        self.client.force_authenticate(self.student)

        question = self.questions_in(self.client.get(self.detail).data)[0]

        self.assertEqual(question['question_text'], 'Which keyword defines a function?')
        self.assertEqual(question['points'], 2)
        self.assertEqual(
            sorted(c['choice_text'] for c in question['choices']), ['def', 'function'])
        self.assertTrue(all(c.get('id') for c in question['choices']))

    def test_the_list_response_does_not_leak_either(self):
        self.client.force_authenticate(self.student)

        results = self.client.get(reverse('quiz-list')).data['results']

        question = self.questions_in(results[0])[0]
        self.assertNotIn('correct_answer', question)

    def test_starting_an_attempt_does_not_leak_it(self):
        # start() responds with QuizAttemptSerializer, which nests the quiz.
        self.client.force_authenticate(self.student)

        response = self.client.post(reverse('quiz-start', args=[self.quiz.id]))

        self.assertIn(response.status_code, (200, 201))
        question = self.questions_in(response.data['quiz'])[0]
        self.assertNotIn('correct_answer', question)

    # -- what an instructor needs -------------------------------------------

    def test_an_instructor_still_gets_the_answers(self):
        # Authoring needs them; hiding these breaks the learning admin.
        self.client.force_authenticate(self.instructor)

        question = self.questions_in(self.client.get(self.detail).data)[0]

        self.assertEqual(question['correct_answer'], str(self.right.id))
        self.assertEqual(
            {c['choice_text']: c['is_correct'] for c in question['choices']},
            {'def': True, 'function': False},
        )

    def test_an_admin_still_gets_the_answers(self):
        self.client.force_authenticate(self.admin)

        question = self.questions_in(self.client.get(self.detail).data)[0]

        self.assertEqual(question['correct_answer'], str(self.right.id))

    # -- and the quiz still works -------------------------------------------

    def test_grading_is_unchanged_by_hiding_the_key(self):
        # The client submits choice ids, which it still receives. If this fails,
        # the fix made every quiz unpassable.
        self.client.force_authenticate(self.student)
        self.client.post(reverse('quiz-start', args=[self.quiz.id]))

        response = self.client.post(
            reverse('quiz-submit', args=[self.quiz.id]),
            {'answers': [{'question_id': str(self.question.id),
                          'answer': str(self.right.id)}]},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['score'], 100)

    def test_a_wrong_answer_still_scores_zero(self):
        self.client.force_authenticate(self.student)
        self.client.post(reverse('quiz-start', args=[self.quiz.id]))

        response = self.client.post(
            reverse('quiz-submit', args=[self.quiz.id]),
            {'answers': [{'question_id': str(self.question.id),
                          'answer': str(self.wrong.id)}]},
            format='json',
        )

        self.assertEqual(response.data['score'], 0)
