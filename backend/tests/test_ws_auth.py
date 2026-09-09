import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

@pytest.mark.asyncio
async def test_ws_auth_success(client: TestClient):
    client.post("/api/v1/auth/register", json={"email": "ws1@sif.demo", "password": "test-password-123", "full_name": "WS"})
    login = client.post("/api/v1/auth/login", json={"email": "ws1@sif.demo", "password": "test-password-123"}).json()
    token = login["access_token"]
    user_id = login["user"]["id"]
    try:
        with client.websocket_connect(f"/ws/etl-progress/{user_id}?token={token}") as websocket:
            pass
    except WebSocketDisconnect as exc:
        assert exc.code != 1008

@pytest.mark.asyncio
async def test_ws_auth_missing_token(client: TestClient):
    client.post("/api/v1/auth/register", json={"email": "ws2@sif.demo", "password": "test-password-123", "full_name": "WS"})
    login = client.post("/api/v1/auth/login", json={"email": "ws2@sif.demo", "password": "test-password-123"}).json()
    user_id = login["user"]["id"]
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/etl-progress/{user_id}") as websocket:
            pass
    assert exc.value.code in (1000, 1008, 403)

@pytest.mark.asyncio
async def test_ws_auth_invalid_token(client: TestClient):
    client.post("/api/v1/auth/register", json={"email": "ws3@sif.demo", "password": "test-password-123", "full_name": "WS"})
    login = client.post("/api/v1/auth/login", json={"email": "ws3@sif.demo", "password": "test-password-123"}).json()
    user_id = login["user"]["id"]
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/etl-progress/{user_id}?token=invalid_token") as websocket:
            websocket.receive_text()
    assert exc.value.code in (1000, 1008, 403)

@pytest.mark.asyncio
async def test_ws_auth_wrong_user(client: TestClient):
    client.post("/api/v1/auth/register", json={"email": "ws4@sif.demo", "password": "test-password-123", "full_name": "WS"})
    login = client.post("/api/v1/auth/login", json={"email": "ws4@sif.demo", "password": "test-password-123"}).json()
    token = login["access_token"]
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/etl-progress/00000000-0000-0000-0000-000000000000?token={token}") as websocket:
            websocket.receive_text()
    assert exc.value.code in (1000, 1008, 403)
