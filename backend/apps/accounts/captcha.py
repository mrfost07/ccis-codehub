"""
Custom CAPTCHA system for CCIS-CodeHub.
Generates math-based challenges with HMAC-signed tokens.
No third-party dependencies required.
"""
import hmac
import hashlib
import time
import base64
import json
import random
from django.conf import settings


# Token validity duration (5 minutes)
CAPTCHA_TOKEN_TTL = 300


def _get_signing_key():
    """Get the HMAC signing key from Django settings."""
    return settings.SECRET_KEY.encode('utf-8')


def _sign(data: str) -> str:
    """Create HMAC-SHA256 signature for data."""
    return hmac.new(
        _get_signing_key(),
        data.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


def generate_captcha_challenge() -> dict:
    """
    Generate a math-based CAPTCHA challenge.
    
    Returns:
        dict with 'question', 'token', and 'expires_at'
    """
    # Generate random math problem
    operations = [
        ('addition', lambda: _addition_challenge()),
        ('subtraction', lambda: _subtraction_challenge()),
        ('multiplication', lambda: _multiplication_challenge()),
    ]
    
    op_name, generator = random.choice(operations)
    question, answer = generator()
    
    # Create signed token
    timestamp = int(time.time())
    expires_at = timestamp + CAPTCHA_TOKEN_TTL
    
    # Token payload
    payload = {
        'a': answer,       # correct answer
        't': timestamp,    # creation time
        'e': expires_at,   # expiry time
    }
    
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    signature = _sign(payload_b64)
    
    # Token = payload.signature
    token = f"{payload_b64}.{signature}"
    
    return {
        'question': question,
        'token': token,
        'expires_at': expires_at,
    }


def verify_captcha_token(token: str, answer) -> tuple:
    """
    Verify a CAPTCHA token and answer.
    
    Args:
        token: The signed CAPTCHA token
        answer: The user's answer to the challenge
        
    Returns:
        tuple of (is_valid: bool, error_message: str or None)
    """
    if not token or answer is None:
        return False, 'Missing CAPTCHA token or answer'
    
    try:
        # Split token into payload and signature
        parts = token.split('.')
        if len(parts) != 2:
            return False, 'Invalid CAPTCHA token format'
        
        payload_b64, provided_signature = parts
        
        # Verify signature
        expected_signature = _sign(payload_b64)
        if not hmac.compare_digest(provided_signature, expected_signature):
            return False, 'Invalid CAPTCHA token signature'
        
        # Decode payload
        payload_json = base64.urlsafe_b64decode(payload_b64).decode()
        payload = json.loads(payload_json)
        
        # Check expiry
        current_time = int(time.time())
        if current_time > payload.get('e', 0):
            return False, 'CAPTCHA has expired. Please refresh and try again.'
        
        # Check answer
        correct_answer = payload.get('a')
        try:
            user_answer = int(answer)
        except (ValueError, TypeError):
            return False, 'Invalid CAPTCHA answer'
        
        if user_answer != correct_answer:
            return False, 'Incorrect CAPTCHA answer'
        
        return True, None
        
    except Exception:
        return False, 'CAPTCHA verification failed'


def _addition_challenge():
    """Generate an addition challenge."""
    a = random.randint(1, 20)
    b = random.randint(1, 20)
    return f"What is {a} + {b}?", a + b


def _subtraction_challenge():
    """Generate a subtraction challenge (result always positive)."""
    a = random.randint(10, 30)
    b = random.randint(1, a)
    return f"What is {a} - {b}?", a - b


def _multiplication_challenge():
    """Generate a simple multiplication challenge."""
    a = random.randint(2, 9)
    b = random.randint(2, 9)
    return f"What is {a} × {b}?", a * b
