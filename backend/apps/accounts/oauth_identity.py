"""
HMAC-signed Google identity tokens.

The Google OAuth callback verifies the user's identity server-side, but the
verified identity then round-trips through the browser before account creation.
A client could tamper with that round-tripped data (or POST straight to the
create-account endpoint) and forge an account for an arbitrary email.

To prevent that, the callback issues a short-lived HMAC-signed token that binds
the Google-verified email/identity; the account-creation endpoint trusts only
this token, never client-supplied identity fields. (Remediation Req 2.)
"""
import base64
import hashlib
import hmac
import json
import time

from django.conf import settings

# 15 minutes: enough to complete the profile-completion wizard.
IDENTITY_TTL = 900


def _sign(data: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        data.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def issue_google_identity_token(email, google_id='', first_name='', last_name='') -> str:
    """Create a signed token binding a Google-verified identity."""
    payload = {
        'email': email,
        'gid': google_id or '',
        'fn': first_name or '',
        'ln': last_name or '',
        'e': int(time.time()) + IDENTITY_TTL,
    }
    payload_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(',', ':')).encode()
    ).decode()
    return f"{payload_b64}.{_sign(payload_b64)}"


def verify_google_identity_token(token: str):
    """
    Return the verified identity dict, or None if the token is missing,
    tampered with, or expired.
    """
    if not token or '.' not in token:
        return None
    try:
        payload_b64, signature = token.split('.', 1)
        if not hmac.compare_digest(signature, _sign(payload_b64)):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        if int(time.time()) > int(payload.get('e', 0)):
            return None
        email = payload.get('email')
        if not email:
            return None
        return {
            'email': email,
            'google_id': payload.get('gid', ''),
            'first_name': payload.get('fn', ''),
            'last_name': payload.get('ln', ''),
        }
    except Exception:
        return None
