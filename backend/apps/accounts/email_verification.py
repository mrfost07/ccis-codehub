"""
Email confirmation for new accounts.

Uses Django's PasswordResetTokenGenerator machinery, which gives us
signed, time-limited tokens with no extra table. `email_verified` is mixed
into the hash so a token stops working the moment it has been used —
clicking the same link twice cannot re-verify or be replayed.
"""
import logging
import threading

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import EmailMultiAlternatives
from django.db import connections
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Token that is invalidated once the address has been confirmed."""

    def _make_hash_value(self, user, timestamp):
        # Including email + email_verified means the token dies after use and
        # if the address changes. Including the password hash means it also
        # dies on a password change.
        return f'{user.pk}{user.email}{user.password}{user.email_verified}{timestamp}'


email_verification_token = EmailVerificationTokenGenerator()


def build_verification_link(user) -> str:
    """Absolute frontend URL the user clicks to confirm their address."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)

    frontend = (getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    if not frontend.startswith(('http://', 'https://')):
        # A relative link is silently useless in an email client — surface it
        # instead of mailing a dead link.
        logger.error(
            'FRONTEND_URL is not an absolute URL (%r); verification links will '
            'not work. Set FRONTEND_URL=https://your-domain in the environment.',
            frontend,
        )
        frontend = frontend or 'http://localhost:3000'

    return f'{frontend}/verify-email/{uid}/{token}'


def decode_uid(uidb64: str):
    """Resolve a uidb64 back to a User, or None if it is malformed/unknown."""
    from .models import User
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        return User.objects.get(pk=uid)
    except Exception:
        return None


def token_is_valid(user, token: str) -> bool:
    """
    Check the token, honouring EMAIL_VERIFICATION_TIMEOUT_HOURS.

    PasswordResetTokenGenerator expires against PASSWORD_RESET_TIMEOUT, so we
    temporarily swap in our own window rather than changing a global that also
    governs password resets.
    """
    hours = getattr(settings, 'EMAIL_VERIFICATION_TIMEOUT_HOURS', 48)
    original = getattr(settings, 'PASSWORD_RESET_TIMEOUT', 259200)
    try:
        settings.PASSWORD_RESET_TIMEOUT = hours * 3600
        return email_verification_token.check_token(user, token)
    finally:
        settings.PASSWORD_RESET_TIMEOUT = original


def mark_verified(user) -> None:
    user.email_verified = True
    user.email_verified_at = timezone.now()
    user.save(update_fields=['email_verified', 'email_verified_at'])


def send_verification_email(user) -> bool:
    """
    Send the confirmation link. Returns True if the message was handed to the
    mail backend.

    Never raises: a mail outage must not roll back a successful signup, so the
    caller decides how to surface the failure (we tell the user to request a
    new link rather than silently pretending it was sent).
    """
    link = build_verification_link(user)
    hours = getattr(settings, 'EMAIL_VERIFICATION_TIMEOUT_HOURS', 48)
    name = user.first_name or user.username or 'there'

    subject = 'Confirm your CCIS CodeHub account'
    text_body = (
        f'Hi {name},\n\n'
        'Welcome to CCIS CodeHub! Confirm your email address to activate your '
        'account and finish setting up your profile:\n\n'
        f'{link}\n\n'
        f'This link expires in {hours} hours.\n\n'
        "If you didn't create this account, you can ignore this email.\n\n"
        '— CCIS CodeHub'
    )
    html_body = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0a0a0a;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#171717;border:1px solid #262626;border-radius:16px;padding:32px">
    <h1 style="color:#fff;font-size:20px;margin:0 0 8px">Confirm your email</h1>
    <p style="color:#a3a3a3;font-size:14px;line-height:1.6;margin:0 0 24px">
      Hi {name}, welcome to CCIS CodeHub. Confirm your email address to activate
      your account and finish setting up your profile.
    </p>
    <a href="{link}"
       style="display:inline-block;background:#9333ea;color:#fff;text-decoration:none;
              padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px">
      Confirm my email
    </a>
    <p style="color:#737373;font-size:12px;line-height:1.6;margin:24px 0 0">
      This link expires in {hours} hours. If the button doesn't work, paste this
      into your browser:<br>
      <span style="color:#a78bfa;word-break:break-all">{link}</span>
    </p>
    <p style="color:#525252;font-size:12px;margin:16px 0 0">
      Didn't create this account? You can safely ignore this email.
    </p>
  </div>
</div>"""

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            to=[user.email],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
        logger.info('Verification email sent to user %s', user.pk)
        return True
    except Exception as exc:
        # Log the failure but never leak the address into logs.
        logger.error('Failed to send verification email to user %s: %s', user.pk, exc)
        return False


def send_verification_email_async(user) -> None:
    """
    Hand the message to a background thread and return immediately.

    Handing a message to Gmail's SMTP relay takes seconds from a datacenter
    IP — TCP, then STARTTLS, then AUTH, then DATA — and that was happening
    inside the signup request, so every registration held a worker for the
    whole handshake and a slow relay stalled signups for everyone.

    Nothing is lost by not waiting: the request cannot report delivery either
    way. Handing off to Gmail only means Gmail *accepted* it, not that it
    reached the inbox — Gmail still queues and retries behind the scenes, so
    arrival is minutes away regardless of what this function returns. The
    resend endpoint is the recovery path when mail genuinely fails.
    """
    def _send():
        try:
            send_verification_email(user)
        except Exception:  # pragma: no cover - send_verification_email swallows its own
            logger.exception('Verification email thread died for user %s', user.pk)
        finally:
            # A thread that opened a DB connection must hand it back, or the
            # pool leaks one connection per signup until Postgres refuses more.
            connections.close_all()

    threading.Thread(
        target=_send,
        name=f'verify-email-{user.pk}',
        daemon=True,  # never hold up a restart for a queued email
    ).start()
