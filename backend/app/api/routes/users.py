from uuid import UUID

from fastapi import APIRouter, Depends

from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession, require_roles
from app.core.constants import UserRole
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.schemas.user import UserPage, UserRead, UserRoleUpdate, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=UserPage, summary="List all users")
async def list_users(
    db: DBSession,
    _: User = Depends(require_roles(UserRole.ADMIN)),
    page: int = 1,
    page_size: int = 50,
) -> UserPage:
    query = select(User).order_by(User.created_at.desc())
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.scalars(query)).all()
    
    return UserPage(
        items=[UserRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/me", response_model=UserRead, summary="Current user profile")
async def my_profile(user: CurrentUser) -> UserRead:
    return user

@router.patch("/{user_id}", response_model=UserRead, summary="Update user profile or status")
async def update_user(
    user_id: UUID, 
    payload: UserUpdate, 
    db: DBSession, 
    _: User = Depends(require_roles(UserRole.ADMIN))
) -> UserRead:
    user = await db.get(User, user_id)
    if not user:
        raise NotFoundError("User")
    
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.site_id is not None:
        user.site_id = payload.site_id
        
    await db.commit()
    await db.refresh(user)
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
