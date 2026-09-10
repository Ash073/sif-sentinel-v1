import asyncio
import csv
import io
import json
import uuid
from datetime import datetime, timezone

import structlog

from sqlalchemy import select
from redis import Redis
from tenacity import retry, stop_after_attempt, wait_exponential

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

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _process_csv_upload_async(content: str, user_id_str: str, ip_address: str | None, task_id: str):
    user_id = uuid.UUID(user_id_str)
    reader = list(csv.DictReader(io.StringIO(content)))
    total_rows = min(len(reader), 100) # limit to 100
    if total_rows == 0:
        return

    processed_count = 0
    # Issue 4 Fix: Tolerate Redis being unavailable — imports must proceed even
    # if the real-time progress channel is offline (e.g. local dev without Redis).
    try:
        redis_client = Redis.from_url(settings.celery_broker_url, socket_connect_timeout=2)
        redis_client.ping()  # test connection immediately
    except Exception:
        redis_client = None

    def report_progress(progress_pct: int, status_msg: str):
        if redis_client is None:
            return
        try:
            redis_client.publish(
                f"etl_progress_{user_id_str}",
                json.dumps({"progress": progress_pct, "status": status_msg})
            )
        except Exception:
            pass  # Never let a Redis failure abort the import

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
                
            # Intelligently detect the narrative column from any company's CSV
            possible_text_columns = [
                "report_text", "final narrative", "description", "incident_description", 
                "observation", "narrative", "event_description", "details", "comments",
                "final_narrative", "text", "body", "content", "what happened"
            ]
            
            text_content = ""
            # Try to find a match in the row's keys (case-insensitive)
            row_keys_lower = {str(k).lower().strip(): k for k in row.keys() if k}
            
            # Exact match first
            found_col = False
            for alias in possible_text_columns:
                if alias in row_keys_lower:
                    text_content = row[row_keys_lower[alias]]
                    found_col = True
                    break
                    
            # Partial match if not found exactly
            if not found_col:
                for alias in possible_text_columns:
                    for k_low, k_orig in row_keys_lower.items():
                        if alias in k_low or k_low in alias:
                            text_content = row[k_orig]
                            found_col = True
                            break
                    if found_col:
                        break

            report = Report(
                report_id=report_id,
                report_type=ReportType(report_type_str),
                report_text=text_content,
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
                structlog.get_logger(__name__).error(
                    "etl_report_analysis_failed", report_id=report_id, error=str(e)
                )
                
            processed_count += 1
            progress_pct = int((processed_count / total_rows) * 90)
            report_progress(progress_pct, f"Processed {processed_count}/{total_rows} reports")
            
        await db.commit()
        
        report_progress(90, "Rebuilding precursor patterns...")
        try:
            await PrecursorService(db).rebuild(commit=True)
        except Exception as e:
            structlog.get_logger(__name__).error("etl_precursor_rebuild_failed", error=str(e))
            
        report_progress(100, "Import complete")
