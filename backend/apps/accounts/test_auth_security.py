"""
Authorization & privilege-escalation tests (remediation Req 1, 3, 4).

Each test targets a concrete abuse case that the pre-fix code allowed, while
also asserting that the legitimate flow still works (Req 34).
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.captcha import generate_captcha_challenge
from apps.accounts.models import User


def _captcha_answer(question: str) -> int:
    """Solve the arithmetic CAPTCHA question the server issued."""
    # Questions look like: "What is 4 + 7?" / "12 - 5" / "3 × 6"
    import re
    a, op, b = re.search(r'(\d+)\s*([+\-×])\s*(\d+)', question).groups()
    a, b = int(a), int(b)
    return {'+': a + b, '-': a - b, '×': a * b}[op]


def _register_payload(**overrides):
    challenge = generate_captcha_challenge()
    payload = {
        'email': 'newbie@ssct.edu.ph',
        'username': 'newbie',
        'first_name': 'New',
        'last_name': 'Bie',
        'password': 'sup3rsecret!',
        'confirm_password': 'sup3rsecret!',
        'program': 'BSIT',
        'year_level': 1,
        'captcha_token': challenge['token'],
        'captcha_answer': _captcha_answer(challenge['question']),
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestRegistrationPrivilegeEscalation:
    """Req 1: self-registration must never grant an elevated role."""

    def test_client_supplied_admin_role_is_ignored(self):
        client = APIClient()
        resp = client.post(reverse('register'), _register_payload(role='admin'), format='json')
        assert resp.status_code == 201, resp.data
        user = User.objects.get(email='newbie@ssct.edu.ph')
        assert user.role == 'student'
        assert user.is_staff is False
        assert user.is_superuser is False

    def test_legitimate_registration_still_succeeds(self):
        client = APIClient()
        resp = client.post(reverse('register'), _register_payload(), format='json')
        assert resp.status_code == 201, resp.data
        assert User.objects.filter(email='newbie@ssct.edu.ph', role='student').exists()


@pytest.mark.django_db
class TestUserViewSetCreationGating:
    """Req 3: only staff may create users via the management viewset."""

    def test_unauthenticated_create_is_rejected(self):
        client = APIClient()
        resp = client.post(
            '/api/auth/users/',
            {'email': 'x@ssct.edu.ph', 'username': 'x', 'role': 'admin', 'is_active': True},
            format='json',
        )
        assert resp.status_code in (401, 403)
        assert not User.objects.filter(email='x@ssct.edu.ph').exists()

    def test_non_staff_create_is_rejected(self):
        student = User.objects.create_user(
            email='stud@ssct.edu.ph', username='stud', password='pw12345678', role='student'
        )
        client = APIClient()
        client.force_authenticate(student)
        resp = client.post(
            '/api/auth/users/',
            {'email': 'y@ssct.edu.ph', 'username': 'y', 'role': 'admin'},
            format='json',
        )
        assert resp.status_code == 403
        assert not User.objects.filter(email='y@ssct.edu.ph').exists()


@pytest.mark.django_db
class TestAdminEndpointsAuthorizeOnStaffFlag:
    """Req 4: admin endpoints authorize on is_staff, not the role string."""

    def test_role_admin_without_staff_is_denied(self):
        """A user whose role string says 'admin' but lacks is_staff is denied."""
        faux_admin = User.objects.create_user(
            email='faux@ssct.edu.ph', username='faux', password='pw12345678', role='admin'
        )
        faux_admin.is_staff = False
        faux_admin.save(update_fields=['is_staff'])
        client = APIClient()
        client.force_authenticate(faux_admin)
        resp = client.get(reverse('admin-dashboard'))
        assert resp.status_code == 403

    def test_staff_user_is_allowed(self):
        real_admin = User.objects.create_user(
            email='real@ssct.edu.ph', username='real', password='pw12345678', role='admin'
        )
        real_admin.is_staff = True
        real_admin.save(update_fields=['is_staff'])
        client = APIClient()
        client.force_authenticate(real_admin)
        resp = client.get(reverse('admin-dashboard'))
        assert resp.status_code == 200
