import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, UploadFile, File, status

from app.api.deps import require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.schemas.common import Message
from app.tasks.etl_tasks import process_csv_upload

router = APIRouter(prefix="/imports", tags=["Imports"])

@router.post("/upload", response_model=Message, status_code=status.HTTP_202_ACCEPTED, summary="Upload a CSV dataset for automated ML processing")
async def upload_dataset(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HSE_MANAGER))
) -> Message:
    
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode('utf-8')
    except UnicodeDecodeError:
        content_str = content_bytes.decode('latin-1')
        
    ip_address = request.client.host if request.client else None
    
    # Trigger Celery task
    process_csv_upload.delay(content_str, str(user.id), ip_address)
    
    return Message(message="Dataset uploaded successfully. ETL and ML processing has started in the background.")
