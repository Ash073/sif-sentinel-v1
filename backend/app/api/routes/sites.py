from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import DBSession, require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.schemas.site import SiteCreate, SiteRead, SiteUpdate
from app.services.site_service import SiteService

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.post("", response_model=SiteRead, status_code=status.HTTP_201_CREATED, summary="Create a site")
async def create_site(payload: SiteCreate, db: DBSession, user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HSE_MANAGER))) -> SiteRead:
    return await SiteService(db, user).create(payload)

@router.get("", response_model=list[SiteRead], summary="List sites")
async def list_sites(db: DBSession, user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HSE_MANAGER, UserRole.HSE_ANALYST, UserRole.REVIEWER, UserRole.VIEWER))) -> list[SiteRead]:
    return await SiteService(db, user).list()

@router.get("/{site_id}", response_model=SiteRead, summary="Get a site")
async def get_site(site_id: UUID, db: DBSession, user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HSE_MANAGER, UserRole.HSE_ANALYST, UserRole.REVIEWER, UserRole.VIEWER))) -> SiteRead:
    return await SiteService(db, user).get(site_id)

@router.patch("/{site_id}", response_model=SiteRead, summary="Update a site")
async def update_site(site_id: UUID, payload: SiteUpdate, db: DBSession, user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HSE_MANAGER))) -> SiteRead:
    return await SiteService(db, user).update(site_id, payload)

from app.schemas.common import Message

@router.delete("/{site_id}", response_model=Message, summary="Soft delete a site")
async def delete_site(site_id: UUID, db: DBSession, user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HSE_MANAGER))) -> Message:
    await SiteService(db, user).delete(site_id)
    return Message(message="Site deleted successfully")
