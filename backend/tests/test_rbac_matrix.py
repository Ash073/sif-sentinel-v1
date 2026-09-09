# pyrefly: ignore [missing-import]
import pytest
from httpx import AsyncClient
from uuid import uuid4

from app.core.constants import UserRole

# Define expected HTTP status codes for each role and endpoint
# Endpoints:
# 1. GET /api/v1/users (Requires ADMIN)
# 2. POST /api/v1/sites (Requires ADMIN)
# 3. GET /api/v1/reports (Requires all roles)
# 4. POST /api/v1/reports (Requires ADMIN, HSE_MANAGER, HSE_ANALYST, REVIEWER - Not VIEWER)
# 5. DELETE /api/v1/reports/{id} (Requires ADMIN, HSE_MANAGER)

RBAC_MATRIX = {
    UserRole.ADMIN: {
        "get_users": 200,
        "post_sites": 201,
        "get_reports": 200,
        "post_reports": 201,
        "delete_reports": 200,
    },
    UserRole.HSE_MANAGER: {
        "get_users": 403,
        "post_sites": 201,
        "get_reports": 200,
        "post_reports": 201,
        "delete_reports": 200,
    },
    UserRole.HSE_ANALYST: {
        "get_users": 403,
        "post_sites": 403,
        "get_reports": 200,
        "post_reports": 201,
        "delete_reports": 403,
    },
    UserRole.REVIEWER: {
        "get_users": 403,
        "post_sites": 403,
        "get_reports": 200,
        "post_reports": 201,
        "delete_reports": 403,
    },
    UserRole.VIEWER: {
        "get_users": 403,
        "post_sites": 403,
        "get_reports": 200,
        "post_reports": 403,
        "delete_reports": 403,
    },
}

@pytest.fixture
def test_site(client, admin_headers):
    # Create a site to be used by all report tests
    import uuid
    code = f"RBAC-{str(uuid.uuid4())[:6]}"
    res = client.post("/api/v1/sites", headers=admin_headers, json={
        "name": f"Test Site {code}",
        "code": code,
        "location": "Test",
        "region": "Test"
    })
    return res.json()["id"]

def create_role_client(client, role: UserRole):
    # Register and promote a user to the specified role, return their token header
    email = f"{role.value.lower()}-rbac-test@sif.demo"
    client.post("/api/v1/auth/register", json={"email": email, "password": "test-password-123", "full_name": f"Test {role.value}"})
    
    # Promote bypassing API
    import asyncio
    from sqlalchemy import select
    from app.models.user import User
    from app.db.session import SessionLocal

    async def promote_user():
        async with SessionLocal() as session:
            user = await session.scalar(select(User).where(User.email == email))
            user.role = role
            await session.commit()
    
    asyncio.run(promote_user())
    
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "test-password-123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.parametrize("role", list(UserRole))
def test_rbac_matrix_enforcement(client, test_site, admin_headers, role):
    headers = create_role_client(client, role)
    expected = RBAC_MATRIX[role]

    # 1. get_users
    res = client.get("/api/v1/users", headers=headers)
    assert res.status_code == expected["get_users"], f"Role {role.value} get_users failed"

    # 2. post_sites
    import uuid
    res = client.post("/api/v1/sites", headers=headers, json={
        "name": f"Role Site {str(uuid.uuid4())[:6]}",
        "code": str(uuid.uuid4())[:6],
        "location": "Test",
        "region": "Test"
    })
    assert res.status_code == expected["post_sites"], f"Role {role.value} post_sites failed"

    # 3. get_reports
    res = client.get("/api/v1/reports", headers=headers)
    assert res.status_code == expected["get_reports"], f"Role {role.value} get_reports failed"

    # 4. post_reports
    res = client.post("/api/v1/reports", headers=headers, json={
        "report_type": "NEAR_MISS",
        "report_text": "RBAC Test Report",
        "site_id": test_site,
        "location": "Area",
        "department": "Dept",
        "reported_at": "2024-01-01T00:00:00Z",
        "source_type": "USER_SUBMITTED"
    })
    assert res.status_code == expected["post_reports"], f"Role {role.value} post_reports failed"
    
    # 5. delete_reports
    # Need a report to delete. Admin creates one first.
    if expected["delete_reports"] != 403:
        report_id = res.json()["report_id"]
    else:
        # Create a report as admin to test 403
        admin_res = client.post("/api/v1/reports", headers=admin_headers, json={
            "report_type": "NEAR_MISS",
            "report_text": "RBAC Test Report Admin",
            "site_id": test_site,
            "location": "Area",
            "department": "Dept",
            "reported_at": "2024-01-01T00:00:00Z",
            "source_type": "USER_SUBMITTED"
        })
        report_id = admin_res.json()["report_id"]

    del_res = client.delete(f"/api/v1/reports/{report_id}", headers=headers)
    assert del_res.status_code == expected["delete_reports"], f"Role {role.value} delete_reports failed"
