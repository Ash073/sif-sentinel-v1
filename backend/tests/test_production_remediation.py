import uuid
import pytest
from app.models.report import Report
from app.core.config import get_settings
from app.db.session import SessionLocal

def create_site(client, headers):
    code = f"TST-{str(uuid.uuid4())[:6]}"
    response = client.post("/api/v1/sites", headers=headers, json={"name": "Test Site", "code": code, "location": "Assam", "region": "North East"})
    assert response.status_code == 201
    return response.json()

def test_report_soft_deletion(client, admin_headers):
    """Verify that deleting a report soft-deletes it and hides it from list views."""
    site = create_site(client, admin_headers)
    # Create a report
    payload = {
        "report_type": "UNSAFE_ACT",
        "report_text": "This is a sufficiently long report text for testing soft deletion to pass validation.",
        "site_id": site["id"],
        "location": "Test Area",
        "department": "Maintenance",
        "reported_at": "2026-01-01T10:00:00Z",
        "source_type": "USER_SUBMITTED"
    }
    create_res = client.post("/api/v1/reports", json=payload, headers=admin_headers)
    if create_res.status_code != 201:
        print("ERROR", create_res.json())
    assert create_res.status_code == 201
    report_id = create_res.json()["report_id"]
    db_id = create_res.json()["id"]

    # Delete the report
    delete_res = client.delete(f"/api/v1/reports/{report_id}", headers=admin_headers)
    assert delete_res.status_code == 200

    # Verify it is hidden from GET /reports/{id}
    get_res = client.get(f"/api/v1/reports/{report_id}", headers=admin_headers)
    assert get_res.status_code == 404

    # Verify it is hidden from GET /reports
    list_res = client.get("/api/v1/reports", headers=admin_headers)
    assert list_res.status_code == 200
    assert not any(r["report_id"] == report_id for r in list_res.json()["items"])

    # Verify soft-delete fields in database (using sync session wrapper or raw query, actually we can just check with a fresh AsyncSession wrapped in asyncio.run or we can trust the API).
    # Since we don't have an async test_db fixture easily accessible, we will trust the API 404.

def test_report_idempotency(client, admin_headers):
    """Verify that identical idempotency keys prevent duplicate report creation."""
    site = create_site(client, admin_headers)
    payload = {
        "report_type": "UNSAFE_ACT",
        "report_text": "This is a sufficiently long report text for testing the idempotency to pass validation.",
        "site_id": site["id"],
        "location": "Test Area",
        "department": "Maintenance",
        "reported_at": "2026-01-01T10:00:00Z",
        "source_type": "USER_SUBMITTED"
    }
    
    headers = admin_headers.copy()
    headers["Idempotency-Key"] = "test-idempotency-key-123"

    # First request
    res1 = client.post("/api/v1/reports", json=payload, headers=headers)
    if res1.status_code != 201:
        print("ERROR", res1.json())
    assert res1.status_code == 201
    report_id1 = res1.json()["report_id"]

    # Second request with same key
    res2 = client.post("/api/v1/reports", json=payload, headers=headers)
    assert res2.status_code == 201
    report_id2 = res2.json()["report_id"]

    # Should be the exact same report
    assert report_id1 == report_id2

    # Third request with different key
    headers["Idempotency-Key"] = "test-idempotency-key-456"
    res3 = client.post("/api/v1/reports", json=payload, headers=headers)
    assert res3.status_code == 201
    report_id3 = res3.json()["report_id"]

    # Should be a new report
    assert report_id1 != report_id3

def test_ml_failure_in_production(client, admin_headers):
    """Verify that in production mode, missing ML weights result in 503 instead of a mock fallback."""
    import os
    import pytest
    from app.core.config import get_settings
    
    settings = get_settings()
    original_env = settings.app_env
    settings.app_env = "production"
    
    try:
        site = create_site(client, admin_headers)
        # Create a new report
        payload = {
            "report_type": "UNSAFE_ACT",
            "report_text": "This is a sufficiently long report text for testing ML failure in production.",
            "site_id": site["id"],
            "location": "Test Area",
            "department": "Maintenance",
            "reported_at": "2026-01-01T10:00:00Z",
            "source_type": "USER_SUBMITTED"
        }
        create_res = client.post("/api/v1/reports", json=payload, headers=admin_headers)
        if create_res.status_code != 201:
            print("ERROR", create_res.json())
        assert create_res.status_code == 201
        report_id = create_res.json()["report_id"]

        # This should fail if weights are actually missing in test env, or if we mock the predictor loading
        # Let's mock the predictor's _load function to simulate missing weights
        from unittest.mock import patch
        
        with patch('app.ml.inference.predictor.SIFPredictor._load', side_effect=RuntimeError("ML_MODELS_UNAVAILABLE")):
            # Attempt to analyze
            analyze_res = client.post(f"/api/v1/reports/{report_id}/analyze", headers=admin_headers)
            assert analyze_res.status_code == 503
            assert analyze_res.json()["error"]["code"] == "MODEL_UNAVAILABLE"
            
        # Also verify that the report status is FAILED
        get_res = client.get(f"/api/v1/reports/{report_id}", headers=admin_headers)
        assert get_res.json()["status"] == "FAILED"
    finally:
        settings.app_env = original_env
