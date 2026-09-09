from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate


from app.services.audit_service import record_audit
from app.models.user import User

class SiteService:
    def __init__(self, db: AsyncSession, current_user: User | None = None) -> None:
        self.db = db
        self.current_user = current_user

    async def create(self, payload: SiteCreate) -> Site:
        if await self.db.scalar(select(Site).where(Site.code == payload.code.upper())):
            raise AppError("SITE_CODE_EXISTS", "A site with that code already exists", 409)
        site = Site(**payload.model_dump(exclude={"code"}), code=payload.code.upper())
        self.db.add(site)
        await self.db.flush()
        
        if self.current_user:
            await record_audit(
                self.db,
                user_id=self.current_user.id,
                action="SITE_CREATED",
                entity_type="site",
                entity_id=site.id,
                details=payload.model_dump(),
                ip_address=None
            )
            
        await self.db.commit()
        await self.db.refresh(site)
        return site

    async def get(self, site_id: UUID) -> Site:
        site = await self.db.get(Site, site_id)
        if not site:
            raise NotFoundError("site")
        return site

    async def list(self) -> list[Site]:
        return list(await self.db.scalars(select(Site).order_by(Site.name)))

    async def update(self, site_id: UUID, payload: SiteUpdate) -> Site:
        site = await self.get(site_id)
        for name, value in payload.model_dump(exclude_unset=True).items():
            setattr(site, name, value)
            
        if self.current_user:
            await record_audit(
                self.db,
                user_id=self.current_user.id,
                action="SITE_UPDATED",
                entity_type="site",
                entity_id=site.id,
                details=payload.model_dump(exclude_unset=True),
                ip_address=None
            )
            
        await self.db.commit()
        await self.db.refresh(site)
        return site

    async def delete(self, site_id: UUID) -> None:
        site = await self.get(site_id)
        site.is_active = False
        
        if self.current_user:
            await record_audit(
                self.db,
                user_id=self.current_user.id,
                action="SITE_DELETED",
                entity_type="site",
                entity_id=site.id,
                details={"is_active": False},
                ip_address=None
            )
            
        await self.db.commit()
