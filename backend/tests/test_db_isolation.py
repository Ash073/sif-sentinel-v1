import pytest
from sqlalchemy import select
from app.models.user import User

@pytest.mark.asyncio
async def test_db_isolation_1(transactional_db):
    """Create a user and commit in test 1."""
    user = User(
        email="isolation-test@sif.demo",
        password_hash="hash",
        full_name="Isolation Test User 1"
    )
    transactional_db.add(user)
    await transactional_db.commit()

@pytest.mark.asyncio
async def test_db_isolation_2(transactional_db):
    """Verify user created in test 1 does not exist in test 2."""
    result = await transactional_db.execute(
        select(User).where(User.email == "isolation-test@sif.demo")
    )
    user = result.scalar_one_or_none()
    assert user is None, "Database isolation failed: user from previous test leaked into this one"
