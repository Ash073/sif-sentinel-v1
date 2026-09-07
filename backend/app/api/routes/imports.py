import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Request, UploadFile, File, status
from sqlalchemy import select

from app.api.deps import DBSession, require_roles
from app.core.constants import ReportStatus, ReportType, SourceType, UserRole
from app.db.session import SessionLocal
from app.models.report import Report
from app.models.site import Site
from app.models.user import User
from app.schemas.common import Message
from app.services.analysis.analysis_service import AnalysisService
from app.services.precursor_engine.precursor_service import PrecursorService

router = APIRouter(prefix="/imports", tags=["Imports"])

async def process_csv_upload_background(content: str, user_id: uuid.UUID, ip_address: str | None):
    """Processes the CSV in the background to prevent request timeout."""
    reader = csv.DictReader(io.StringIO(content))
    processed_count = 0
    
    async with SessionLocal() as db:
        # Get the first site, or create one if none exists
        site = await db.scalar(select(Site).limit(1))
        if not site:
            site = Site(name="Demo Plant Alpha", region="North America", timezone="UTC")
            db.add(site)
            await db.flush()
            
        for row in reader:
            if processed_count >= 100:  # Safety limit for bulk imports
                break
                
            report_id = f"IMP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{processed_count:04d}"
            report_type_str = row.get("report_type", "INCIDENT")
            if not report_type_str:
                report_type_str = "INCIDENT"
                
            report = Report(
                report_id=report_id,
                report_type=ReportType(report_type_str),
                report_text=row.get("report_text", ""),
                site_id=site.id,
                location=row.get("location", "Imported Unit"),
                department=row.get("department", "Operations"),
                activity=row.get("activity"),
                reported_at=datetime.now(timezone.utc),
                source_type=SourceType.IMPORTED,
                status=ReportStatus.NEW,
                created_by=user_id
            )
            db.add(report)
            await db.flush()
            
            # Trigger analysis
            try:
                await AnalysisService(db).analyze_report(report.report_id, user_id, ip_address)
            except Exception as e:
                print(f"Failed to analyze imported report {report_id}: {e}")
                
            processed_count += 1
            
        await db.commit()
        
        # Rebuild precursor patterns after bulk import
        try:
            print("Rebuilding precursor patterns after import...")
            await PrecursorService(db).rebuild(commit=True)
            print("Successfully rebuilt patterns.")
        except Exception as e:
            print(f"Failed to rebuild precursors: {e}")

@router.post("/upload", response_model=Message, status_code=status.HTTP_202_ACCEPTED, summary="Upload a CSV dataset for automated ML processing")
async def upload_dataset(
    background_tasks: BackgroundTasks,
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
    background_tasks.add_task(process_csv_upload_background, content_str, user.id, ip_address)
    
    return Message(message="Dataset uploaded successfully. ETL and ML processing has started in the background.")
