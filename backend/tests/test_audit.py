def test_audit_log_filters(client, admin_headers):
    # Create some sites as audit events
    import uuid
    import asyncio
    from app.models.audit_log import AuditLog
    from app.db.session import SessionLocal
    
    id1 = uuid.uuid4()
    id2 = uuid.uuid4()
    
    async def create_logs():
        async with SessionLocal() as session:
            session.add(AuditLog(
                user_id=uuid.uuid4(),
                action="SITE_CREATED",
                entity_type="site",
                entity_id=id1
            ))
            session.add(AuditLog(
                user_id=uuid.uuid4(),
                action="SITE_CREATED",
                entity_type="site",
                entity_id=id2
            ))
            await session.commit()
    
    asyncio.run(create_logs())

    # Test filtering by entity_type
    res = client.get("/api/v1/audit-logs?entity_type=site", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()["items"]) >= 2
    
    # Test filtering by action
    res = client.get("/api/v1/audit-logs?action=SITE_CREATED", headers=admin_headers)
    assert res.status_code == 200
    assert len(res.json()["items"]) >= 2
    
    # Test filtering by entity_id
    res = client.get(f"/api/v1/audit-logs?entity_id={id1}", headers=admin_headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["entity_id"] == str(id1)
