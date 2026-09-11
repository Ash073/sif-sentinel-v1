import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to sys.path explicitly to prevent ModuleNotFoundError
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

TEST_DB = Path(__file__).parent / "test_sif.db"

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

os.environ["TESTING"] = "1"
os.environ["LLM_ENABLED"] = "False"

test_db_url = os.environ.get("TEST_DATABASE_URL", "").strip()
is_postgres = test_db_url != ""

if is_postgres:
    os.environ["DATABASE_URL"] = test_db_url
else:
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"

os.environ["JWT_SECRET_KEY"] = "test-only-secret-key-that-is-long-enough"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
os.environ.setdefault("SIF_MODEL_VERSION", "v1")

import app.models  # noqa: E402, F401
from app.db.base import Base  # noqa: E402
import app.db.session as app_session_mod  # noqa: E402
from app.main import app  # noqa: E402

if is_postgres:
    test_engine = app_session_mod.engine
else:
    test_engine = create_async_engine(
        os.environ["DATABASE_URL"],
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    # CRITICAL: Rebind the global engine and SessionLocal so that tests using
    # SessionLocal() natively (like test_llm_provider.py) use the StaticPool engine!
    app_session_mod.engine = test_engine
    from sqlalchemy.ext.asyncio import async_sessionmaker
    app_session_mod.SessionLocal = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)


# Flag set by the `database` module fixture to suppress transactional_db's drop_all.
# This allows modules that commit real data via SessionLocal() to keep the schema alive.
_skip_teardown_drop: bool = False

@pytest_asyncio.fixture(scope="session", autouse=True)
async def session_setup():
    # Schema is created per-test by transactional_db; nothing to do at session level.
    yield
    if not is_postgres:
        await test_engine.dispose()
        if TEST_DB.exists():
            try:
                TEST_DB.unlink()
            except OSError:
                pass
    else:
        await test_engine.dispose()

# Per-test isolation: create schema, yield session, drop schema.
# This guarantees a clean slate for every test function.
@pytest_asyncio.fixture(autouse=True)
async def transactional_db():
    from app.api.deps import get_db

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    connection = await test_engine.connect()

    session = AsyncSession(
        bind=connection,
        expire_on_commit=False,
    )

    original_session_local = app_session_mod.SessionLocal
    app_session_mod.SessionLocal = lambda: session
    app.dependency_overrides[get_db] = lambda: session

    yield session

    await session.close()
    await connection.close()

    if not _skip_teardown_drop:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    app.dependency_overrides.clear()
    app_session_mod.SessionLocal = original_session_local

@pytest.fixture()
def client(transactional_db):
    with TestClient(app) as test_client:
        yield test_client

@pytest_asyncio.fixture()
async def engine(transactional_db):
    """Expose the underlying engine for tests that need separate sessions (concurrency tests)."""
    yield test_engine

@pytest_asyncio.fixture()
async def db_session(transactional_db):
    """Alias for transactional_db — used by test_soft_delete_integrity.py."""
    yield transactional_db

@pytest_asyncio.fixture(scope="module")
async def database():
    """Module-scoped fixture for modules that commit real data via SessionLocal().

    Sets _skip_teardown_drop so the autouse transactional_db doesn't destroy
    the schema between test functions within the same module. The schema is
    dropped cleanly at module teardown.
    """
    global _skip_teardown_drop
    _skip_teardown_drop = True
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    _skip_teardown_drop = False

async def promote(email: str, role: str = "ADMIN"):
    from sqlalchemy import select
    from app.core.constants import UserRole
    from app.models.user import User
    async with app_session_mod.SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email))
        user.role = UserRole(role)
        await session.commit()

@pytest_asyncio.fixture()
async def admin_headers(client):
    email = "admin-test@sif.demo"
    client.post("/api/v1/auth/register", json={"email": email, "password": "test-password-123", "full_name": "Test Admin"})
    await promote(email)
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "test-password-123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
