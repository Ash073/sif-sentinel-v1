"""Authentication test suite.

Covers:
- Registration (success, duplicate email)
- Login (success, wrong password, inactive user)
- GET /me (authenticated, unauthenticated, invalid token)
- Logout + token blacklisting
- Refresh token
- Change password
- Invalid/malformed JWT rejected
- Password reset endpoint REMOVED — verified not present in API
- Role protection
"""

import asyncio

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client, suffix: str, password: str = "secure-password-123") -> None:
    """Register a user; email uses @sif.demo which passes EmailStr validation."""
    client.post(
        "/api/v1/auth/register",
        json={"email": f"{suffix}@sif.demo", "password": password, "full_name": f"Test {suffix}"},
    )


def _login_token(client, suffix: str, password: str = "secure-password-123") -> str:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": f"{suffix}@sif.demo", "password": password},
    )
    assert r.status_code == 200, f"Login failed for {suffix}: {r.text}"
    return r.json()["access_token"]


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def test_register_success(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "auth-new@sif.demo", "password": "secure-password-123", "full_name": "Auth Test"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "auth-new@sif.demo"
    assert "id" in body
    assert "password_hash" not in body  # never leak hash


def test_register_duplicate_email_returns_409(client):
    payload = {"email": "auth-dup@sif.demo", "password": "secure-password-123", "full_name": "Dup"}
    client.post("/api/v1/auth/register", json=payload)
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


def test_register_short_password_rejected(client):
    """Password shorter than 12 chars must be rejected with 422."""
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "auth-weak@sif.demo", "password": "short", "full_name": "Weak"},
    )
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_success_returns_token(client):
    _register(client, "auth-loginok")
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "auth-loginok@sif.demo", "password": "secure-password-123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "auth-loginok@sif.demo"


def test_login_wrong_password_returns_401(client):
    _register(client, "auth-wrongpw")
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "auth-wrongpw@sif.demo", "password": "definitely-wrong"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_unknown_email_returns_401(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody-ever@sif.demo", "password": "doesntmatter"},
    )
    assert r.status_code == 401


def test_login_inactive_user_returns_403(client):
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.user import User

    email = "auth-inactive@sif.demo"
    _register(client, "auth-inactive")

    async def deactivate():
        async with SessionLocal() as session:
            user = await session.scalar(select(User).where(User.email == email))
            if user:
                user.is_active = False
                await session.commit()

    asyncio.run(deactivate())

    r = client.post("/api/v1/auth/login", json={"email": email, "password": "secure-password-123"})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "INACTIVE_USER"


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

def test_me_returns_current_user(client):
    _register(client, "auth-metest")
    token = _login_token(client, "auth-metest")

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "auth-metest@sif.demo"


def test_me_without_token_returns_401(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_with_invalid_token_returns_401(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer totally.invalid.token"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_TOKEN"


# ---------------------------------------------------------------------------
# Logout + Token Blacklisting
# ---------------------------------------------------------------------------

def test_logout_invalidates_token(client):
    _register(client, "auth-logout")
    token = _login_token(client, "auth-logout")
    headers = {"Authorization": f"Bearer {token}"}

    # Token works before logout
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200

    # Logout
    logout_r = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_r.status_code == 200

    # Token is blacklisted — subsequent requests must be rejected
    me_after = client.get("/api/v1/auth/me", headers=headers)
    assert me_after.status_code == 401
    assert me_after.json()["error"]["code"] == "INVALID_TOKEN"


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------

def test_refresh_returns_new_token(client):
    _register(client, "auth-refresh")
    token = _login_token(client, "auth-refresh")

    r = client.post("/api/v1/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    new_token = r.json()["access_token"]
    assert new_token != token  # fresh jti


# ---------------------------------------------------------------------------
# Change Password
# ---------------------------------------------------------------------------

def test_change_password_success(client):
    _register(client, "auth-chpw")
    token = _login_token(client, "auth-chpw")

    r = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "secure-password-123", "new_password": "new-password-456-x"},
    )
    assert r.status_code == 200

    # Old password no longer works
    old = client.post("/api/v1/auth/login", json={"email": "auth-chpw@sif.demo", "password": "secure-password-123"})
    assert old.status_code == 401

    # New password works
    new = client.post("/api/v1/auth/login", json={"email": "auth-chpw@sif.demo", "password": "new-password-456-x"})
    assert new.status_code == 200


def test_change_password_wrong_current_returns_401(client):
    _register(client, "auth-chpw-wrong")
    token = _login_token(client, "auth-chpw-wrong")

    r = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": "wrong-current-pw", "new_password": "new-password-456"},
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Password Reset — REMOVED, must NOT be present
# ---------------------------------------------------------------------------

def test_password_reset_endpoint_does_not_exist(client):
    """The /auth/reset-password endpoint was removed as it was a mock.
    Must return 404 or 405, never 200."""
    r = client.post("/api/v1/auth/reset-password", json={"email": "anyone@sif.demo"})
    assert r.status_code in (404, 405), (
        f"Expected 404/405 but got {r.status_code} — "
        "reset-password endpoint must not exist in production API"
    )


# ---------------------------------------------------------------------------
# Role / auth protection
# ---------------------------------------------------------------------------

def test_unauthorized_access_to_role_protected_endpoint(client):
    """No token → 401."""
    assert client.post("/api/v1/sites", json={}).status_code == 401


def test_viewer_role_cannot_create_site(client):
    _register(client, "auth-viewer-site")
    token = _login_token(client, "auth-viewer-site")

    r = client.post(
        "/api/v1/sites",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Should Fail", "code": "FAIL1", "location": "X", "region": "Y"},
    )
    assert r.status_code == 403
