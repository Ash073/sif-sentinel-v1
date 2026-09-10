import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from pwdlib import PasswordHash
from app.models.user import User
from app.core.constants import UserRole
from app.core.config import get_settings

settings = get_settings()
engine = create_async_engine(settings.database_url)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
pwd_context = PasswordHash.recommended()

async def seed_demo_users():
    demo_users = [
        {"email": "admin@sifsentinel.com", "name": "System Admin", "role": UserRole.ADMIN},
        {"email": "manager@sifsentinel.com", "name": "HSE Manager", "role": UserRole.HSE_MANAGER},
        {"email": "analyst@sifsentinel.com", "name": "Safety Analyst", "role": UserRole.HSE_ANALYST},
        {"email": "reviewer@sifsentinel.com", "name": "Field Reviewer", "role": UserRole.REVIEWER},
        {"email": "viewer@sifsentinel.com", "name": "Site Viewer", "role": UserRole.VIEWER},
    ]
    password = pwd_context.hash("Sentinel2026!")

    async with async_session() as session:
        for u in demo_users:
            result = await session.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if not existing:
                new_user = User(
                    email=u["email"],
                    password_hash=password,
                    full_name=u["name"],
                    role=u["role"],
                    is_active=True
                )
                session.add(new_user)
                print(f"Created {u['role']}")
        await session.commit()

if __name__ == "__main__":
    asyncio.run(seed_demo_users())
