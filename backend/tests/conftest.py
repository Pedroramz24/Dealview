"""Shared test configuration — loads secrets from environment variables."""
import os
import time
import uuid
import pytest

API_URL = os.environ.get("TEST_API_URL", "https://image-upload-fix-30.preview.emergentagent.com")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")

# Shared test credential defaults — used when env vars are not set
DEFAULT_TEST_PASSWORD = os.environ.get("TEST_DEFAULT_PASSWORD", "TestPass123!")


def make_test_email(prefix="test"):
    """Generate a unique test email address."""
    return f"{prefix}_{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com"


@pytest.fixture
def test_password():
    return DEFAULT_TEST_PASSWORD


@pytest.fixture
def test_credentials():
    """Returns a dict with unique email and shared password."""
    return {"email": make_test_email(), "password": DEFAULT_TEST_PASSWORD}
