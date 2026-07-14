"""
JWT refresh endpoint (Req 20): a valid refresh token yields a fresh access
token so clients aren't forced to log out when the short-lived access expires.
"""
import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User

URL = '/api/auth/token/refresh/'


@pytest.mark.django_db
class TestTokenRefresh:
    def test_valid_refresh_returns_new_access(self):
        user = User.objects.create_user(
            email='r@ssct.edu.ph', username='r', password='pw12345678', role='student'
        )
        refresh = str(RefreshToken.for_user(user))
        resp = APIClient().post(URL, {'refresh': refresh}, format='json')
        assert resp.status_code == 200, resp.data
        assert 'access' in resp.data
        assert resp.data['access']

    def test_invalid_refresh_is_rejected(self):
        resp = APIClient().post(URL, {'refresh': 'not-a-real-token'}, format='json')
        assert resp.status_code == 401
