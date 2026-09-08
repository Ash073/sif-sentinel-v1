from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, PasswordResetRequest, TokenResponse
from app.schemas.common import Message
from app.schemas.user import UserRead, UserRegister
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Register a user")
async def register(payload: UserRegister, db: DBSession) -> UserRead:
    return await AuthService(db).register(payload)

@router.post("/login", response_model=TokenResponse, summary="Login and receive a bearer token")
async def login(payload: LoginRequest, db: DBSession) -> TokenResponse:
    user = await AuthService(db).authenticate(str(payload.email), payload.password)
    return TokenResponse(access_token=create_access_token(user.id), user=user)

@router.get("/me", response_model=UserRead, summary="Current authenticated user")
async def me(user: CurrentUser) -> UserRead:
    return user

@router.post("/logout", response_model=Message, summary="Logout a user")
async def logout(user: CurrentUser) -> Message:
    return Message(message="Successfully logged out. Please clear your token locally.")

@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(user: CurrentUser) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(user.id), user=user)

@router.post("/reset-password", response_model=Message, summary="Request password reset")
async def reset_password(payload: PasswordResetRequest) -> Message:
    print(f"MOCK: Password reset link for {payload.email} sent. Click https://example.com/reset?token=mock_token")
    return Message(message="If that email is registered, a reset link has been sent.")

