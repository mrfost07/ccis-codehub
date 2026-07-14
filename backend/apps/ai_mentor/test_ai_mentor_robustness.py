"""
AI mentor robustness (Req 18): role read from the User model (18.5) and the
comment path calls an existing ContentGenerator method (18.3).
"""
import pytest

from apps.accounts.models import User
from apps.ai_mentor.views import get_user_role
from apps.ai_mentor.services.content_generator import ContentGenerator


@pytest.mark.django_db
class TestUserRoleResolution:
    """Req 18.5: role comes from the User model, not a non-existent app."""

    def test_instructor_role_detected(self):
        u = User.objects.create_user(
            email='i@ssct.edu.ph', username='i', password='pw12345678', role='instructor'
        )
        assert get_user_role(u) == 'instructor'

    def test_student_role_is_default(self):
        u = User.objects.create_user(
            email='s@ssct.edu.ph', username='s', password='pw12345678', role='student'
        )
        assert get_user_role(u) == 'student'

    def test_staff_is_admin(self):
        u = User.objects.create_user(
            email='a@ssct.edu.ph', username='a', password='pw12345678', role='student'
        )
        u.is_staff = True
        u.save(update_fields=['is_staff'])
        assert get_user_role(u) == 'admin'


class TestContentGeneratorMethods:
    """Req 18.3: the comment path must call a method that exists."""

    def test_generate_post_content_exists(self):
        assert hasattr(ContentGenerator, 'generate_post_content')

    def test_generate_comment_does_not_exist(self):
        # The view no longer relies on this non-existent method.
        assert not hasattr(ContentGenerator, 'generate_comment')
