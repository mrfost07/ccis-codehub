"""
Google OAuth account-creation security (Req 2): identity must come from a
server-verified token, never from client-supplied fields.
"""
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.oauth_identity import issue_google_identity_token

URL = '/api/auth/google/create-account/'
PROFILE = {'program': 'BSIT', 'year_level': 1}


@pytest.mark.django_db
class TestGoogleAccountCreation:
    def test_client_supplied_identity_without_token_is_rejected(self):
        resp = APIClient().post(
            URL,
            {'google_data': {'email': 'victim@ssct.edu.ph'}, 'profile_data': PROFILE},
            format='json',
        )
        assert resp.status_code == 401
        assert not User.objects.filter(email='victim@ssct.edu.ph').exists()

    def test_tampered_token_is_rejected(self):
        token = issue_google_identity_token('a@ssct.edu.ph') + 'tamper'
        resp = APIClient().post(
            URL, {'identity_token': token, 'profile_data': PROFILE}, format='json'
        )
        assert resp.status_code == 401
        assert not User.objects.filter(email='a@ssct.edu.ph').exists()

    def test_valid_token_creates_student_account(self):
        token = issue_google_identity_token('newgrad@ssct.edu.ph', 'gid123', 'New', 'Grad')
        resp = APIClient().post(
            URL, {'identity_token': token, 'profile_data': PROFILE}, format='json'
        )
        assert resp.status_code in (200, 201), resp.data
        user = User.objects.get(email='newgrad@ssct.edu.ph')
        assert user.role == 'student'
        assert user.is_staff is False
        assert user.first_name == 'New'  # from the verified token, not the client

    def test_non_institutional_email_is_rejected(self):
        token = issue_google_identity_token('outsider@gmail.com')
        resp = APIClient().post(
            URL, {'identity_token': token, 'profile_data': PROFILE}, format='json'
        )
        assert resp.status_code == 403
        assert not User.objects.filter(email='outsider@gmail.com').exists()
