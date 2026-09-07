import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/etl-progress/{user_id}")
async def etl_progress_ws(websocket: WebSocket, user_id: str):
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
