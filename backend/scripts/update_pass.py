import asyncio
from app.db.session import SessionLocal
from app.models.user import User
from sqlalchemy import select
from app.core.security import hash_password

async def run():
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.email=='admin@sifsentinel.com'))
        if user:
            user.password_hash = hash_password('admin123')
            await db.commit()
            print('Password updated')
        else:
            print('User not found')

if __name__ == "__main__":
    asyncio.run(run())
