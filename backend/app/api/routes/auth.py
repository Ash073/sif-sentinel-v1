from fastapi import APIRouter, status, Request

from app.api.deps import CurrentUser, DBSession
from app.core.security import create_access_token
from app.core.rate_limit import limiter
from app.schemas.auth import LoginRequest, PasswordResetRequest, TokenResponse, ChangePasswordRequest
from app.schemas.common import Message
from app.schemas.user import UserRead, UserRegister
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Register a user")
@limiter.limit("5/minute")
async def register(request: Request, payload: UserRegister, db: DBSession) -> UserRead:
    return await AuthService(db).register(payload)

@router.post("/login", response_model=TokenResponse, summary="Login and receive a bearer token")
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: DBSession) -> TokenResponse:
    user = await AuthService(db).authenticate(str(payload.email), payload.password)
    return TokenResponse(access_token=create_access_token(user.id), user=user)

@router.get("/me", response_model=UserRead, summary="Current authenticated user")
async def me(user: CurrentUser) -> UserRead:
    return user

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import Depends
from app.api.deps import bearer_scheme
import jwt
from app.core.config import get_settings
from app.models.token_blocklist import TokenBlocklist
from datetime import datetime, UTC

@router.post("/logout", response_model=Message, summary="Logout a user")
async def logout(
    user: CurrentUser, 
    db: DBSession,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)
) -> Message:
    if credentials:
        settings = get_settings()
        try:
            payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                blocklist = TokenBlocklist(jti=jti, expires_at=datetime.fromtimestamp(exp, tz=UTC))
                db.add(blocklist)
                await db.commit()
        except Exception:
            pass
    return Message(message="Successfully logged out.")

@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(user: CurrentUser) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(user.id), user=user)

@router.post("/reset-password", response_model=Message, summary="Request password reset")
async def reset_password(payload: PasswordResetRequest) -> Message:
    print(f"MOCK: Password reset link for {payload.email} sent. Click https://example.com/reset?token=mock_token")
    return Message(message="If that email is registered, a reset link has been sent.")

@router.post("/change-password", response_model=Message, summary="Change password")
async def change_password(payload: ChangePasswordRequest, user: CurrentUser, db: DBSession) -> Message:
    await AuthService(db).change_password(user, payload.current_password, payload.new_password)
    return Message(message="Password changed successfully")

