import asyncio
import json
import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User

settings = get_settings()
router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/etl-progress/{user_id}")
async def etl_progress_ws(websocket: WebSocket, user_id: str, token: str = Query(...)):
    # Authenticate via token query parameter
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("sub") != user_id:
            await websocket.close(code=1008, reason="Token does not match user_id")
            return
    except jwt.PyJWTError:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    # Check if user actually exists and is active
    try:
        db_generator = get_db()
        db: AsyncSession = await anext(db_generator)
        user = await db.get(User, user_id)
        if not user or not user.is_active:
            await websocket.close(code=1008, reason="User is unavailable")
            return
    except Exception:
        pass
        
    await websocket.accept()
    redis_client = Redis.from_url(settings.celery_broker_url)
    pubsub = redis_client.pubsub()
    channel_name = f"etl_progress_{user_id}"
    await pubsub.subscribe(channel_name)
    
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                data = message['data'].decode('utf-8')
                await websocket.send_text(data)
                
                # Close condition
                parsed = json.loads(data)
                if parsed.get('progress') == 100:
                    break
            else:
                # Add a small sleep to prevent tight loop
                await asyncio.sleep(0.1)
                
    except WebSocketDisconnect:
        print(f"Client disconnected from {channel_name}")
    finally:
        await pubsub.unsubscribe(channel_name)
        await redis_client.aclose()
