"""
Contracts the frontend depends on, pinned so a payload optimisation cannot
quietly break a feature again.

`content` holds the entire body of a module or quiz and was ~90% of both list
payloads, so list responses omit it. That is safe ONLY because every consumer
that renders or edits a body loads it from the detail route. When the field was
first dropped, three quiz consumers were still reading it from list rows:

  * the student module page gated the quiz on `quiz.content`, so after the trim
    no quiz ever appeared;
  * the instructor quiz editor populated its form from a list row and PATCHed
    `content` back — saving a title wiped every question, since the questions
    live inside content;
  * "host as online quiz" parsed its questions out of the same field and
    imported none.

None of that was visible from the backend: the endpoints all returned 200 and
the payloads shrank exactly as intended. These tests state the contract in the
place a future change to either serializer will trip over it.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserProfile
from apps.learning.models import CareerPath, LearningModule, Quiz

BODY = '<div class="module-slide">Question 1: What is 2+2?</div>'


class ContentIsListOmittedButDetailAvailable(TestCase):
    """A body dropped from a list must still be reachable per object."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='ct_admin', email='ct_admin@ssct.edu.ph',
            password='x', role='admin', is_staff=True,
        )
        UserProfile.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.path = CareerPath.objects.create(
            name='CT Path', slug='ct-path', description='d',
            program_type='BSIT', difficulty_level='beginner',
            estimated_duration=4, is_active=True,
        )
        self.module = LearningModule.objects.create(
            career_path=self.path, title='CT Module', description='d',
            order=0, content=BODY,
        )
        self.quiz = Quiz.objects.create(
            learning_module=self.module, title='CT Quiz', description='d',
            content=BODY,
        )

    def _rows(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200, f'{url} -> {response.status_code}')
        body = response.json()
        return body['results'] if isinstance(body, dict) and 'results' in body else body

    def _row_for(self, url, obj_id):
        row = next((r for r in self._rows(url) if r['id'] == str(obj_id)), None)
        self.assertIsNotNone(row, f'{obj_id} missing from {url}')
        return row

    def _detail(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200, f'{url} -> {response.status_code}')
        return response.json()

    # -- the trim itself ---------------------------------------------------

    def test_quiz_list_omits_content(self):
        self.assertNotIn('content', self._row_for('/api/learning/quizzes/', self.quiz.id))

    def test_module_list_omits_content(self):
        self.assertNotIn('content', self._row_for('/api/learning/modules/', self.module.id))

    def test_admin_module_list_omits_content(self):
        self.assertNotIn(
            'content', self._row_for('/api/learning/admin/modules/', self.module.id),
        )

    # -- and the escape hatch that makes it safe --------------------------

    def test_quiz_detail_still_carries_content(self):
        """
        The student module page, the quiz editor and the host-online flow all
        resolve the body through this route. If it stops returning `content`,
        all three break with no other signal.
        """
        detail = self._detail(f'/api/learning/quizzes/{self.quiz.id}/')
        self.assertEqual(detail.get('content'), BODY)

    def test_module_detail_still_carries_content(self):
        detail = self._detail(f'/api/learning/modules/{self.module.id}/')
        self.assertEqual(detail.get('content'), BODY)

    def test_admin_module_detail_still_carries_content(self):
        detail = self._detail(f'/api/learning/admin/modules/{self.module.id}/')
        self.assertEqual(detail.get('content'), BODY)

    # -- the field the module page uses to find its quiz -------------------

    def test_quiz_list_filtered_by_module_returns_the_id_to_fetch(self):
        """
        The module page finds its quiz with ?learning_module=<id> and then
        loads that id's detail route. Both halves have to keep working.
        """
        rows = self._rows(f'/api/learning/quizzes/?learning_module={self.module.id}')
        self.assertEqual([r['id'] for r in rows], [str(self.quiz.id)])
        self.assertEqual(
            self._detail(f'/api/learning/quizzes/{rows[0]["id"]}/')['content'], BODY,
        )

    # -- and the write path that made the regression destructive ----------

    def test_patching_a_quiz_preserves_content_when_not_sent(self):
        """
        A PATCH that omits `content` must not blank it.

        The editor sends the whole form including content, so the damage came
        from the form being filled with '' — but a client updating only a title
        should never be able to lose the body either.
        """
        response = self.client.patch(
            f'/api/learning/quizzes/{self.quiz.id}/', {'title': 'Renamed'}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.title, 'Renamed')
        self.assertEqual(self.quiz.content, BODY)
