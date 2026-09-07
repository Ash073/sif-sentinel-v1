import asyncio
import csv
import io
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from redis import Redis

from app.core.celery_app import celery_app
from app.core.config import get_settings
from app.core.constants import ReportStatus, ReportType, SourceType
from app.db.session import SessionLocal
from app.models.report import Report
from app.models.site import Site
from app.services.analysis.analysis_service import AnalysisService
from app.services.precursor_engine.precursor_service import PrecursorService

settings = get_settings()

@celery_app.task(bind=True, name="process_csv_upload")
def process_csv_upload(self, content: str, user_id_str: str, ip_address: str | None):
    # Run the async code inside a synchronous wrapper
    asyncio.run(_process_csv_upload_async(content, user_id_str, ip_address, self.request.id))

async def _process_csv_upload_async(content: str, user_id_str: str, ip_address: str | None, task_id: str):
    user_id = uuid.UUID(user_id_str)
    reader = list(csv.DictReader(io.StringIO(content)))
    total_rows = min(len(reader), 100) # limit to 100
    if total_rows == 0:
        return

    processed_count = 0
    redis_client = Redis.from_url(settings.celery_broker_url)
    
    def report_progress(progress_pct: int, status_msg: str):
        redis_client.publish(
            f"etl_progress_{user_id_str}",
            json.dumps({"progress": progress_pct, "status": status_msg})
        )

    report_progress(0, "Starting import...")
    
    async with SessionLocal() as db:
        site = await db.scalar(select(Site).limit(1))
        if not site:
            site = Site(name="Demo Plant Alpha", region="North America", timezone="UTC")
            db.add(site)
            await db.flush()
            
        for row in reader[:100]:
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
            
            try:
                await AnalysisService(db).analyze_report(report.report_id, user_id, ip_address)
            except Exception as e:
                print(f"Failed to analyze imported report {report_id}: {e}")
                
            processed_count += 1
            progress_pct = int((processed_count / total_rows) * 90)
            report_progress(progress_pct, f"Processed {processed_count}/{total_rows} reports")
            
        await db.commit()
        
        report_progress(90, "Rebuilding precursor patterns...")
        try:
            await PrecursorService(db).rebuild(commit=True)
        except Exception as e:
            print(f"Failed to rebuild precursors: {e}")
            
        report_progress(100, "Import complete")
