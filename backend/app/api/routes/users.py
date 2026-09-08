from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DBSession, require_roles
from app.core.constants import UserRole
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.user import UserRead, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserRead, summary="Current user profile")
async def my_profile(user: CurrentUser) -> UserRead:
    return user

@router.patch("/{user_id}/role", response_model=UserRead, summary="Update user role")
async def update_user_role(
    user_id: UUID, 
    payload: UserRoleUpdate, 
    db: DBSession, 
    _: User = Depends(require_roles(UserRole.ADMIN))
) -> UserRead:
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User")
    
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    return user
