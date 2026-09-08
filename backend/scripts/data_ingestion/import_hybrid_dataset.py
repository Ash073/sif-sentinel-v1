import asyncio
import csv
import sys
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

# Add the project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from app.db.session import SessionLocal
from app.models.site import Site
from app.models.user import User
from app.core.constants import ReportType, SourceType
from app.schemas.report import ReportCreate
from app.services.report_service import ReportService
from sqlalchemy import select

async def get_or_create_site(db, code: str, name: str) -> Site:
    site = await db.scalar(select(Site).where(Site.code == code))
    if not site:
        site = Site(name=name, code=code, region="Hybrid", timezone="UTC")
        db.add(site)
        await db.flush()
    return site

async def get_system_user(db) -> User:
    user = await db.scalar(select(User).where(User.email == "system@sifsentinel.com"))
    if not user:
        user = User(
            email="system@sifsentinel.com",
            full_name="System Importer",
            role="ADMIN",
            is_active=True
        )
        db.add(user)
        await db.flush()
    return user

async def main():
    if len(sys.argv) < 2:
        print("Usage: python import_hybrid_dataset.py <path_to_csv>")
        sys.exit(1)
        
    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"File not found: {csv_path}")
        sys.exit(1)

    async with SessionLocal() as db:
        print("Connecting to database...")
        user = await get_system_user(db)
        await db.commit()
        
        report_service = ReportService(db)
        
        count = 0
        print(f"Reading from {csv_path}...")
        with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                site_code = row.get("site_code", "OSHA-01").upper()
                site_name = row.get("site_name", "OSHA Dataset")
                
                site = await get_or_create_site(db, site_code, site_name)
                
                report_type_str = row.get("report_type", "INCIDENT")
                if not report_type_str:
                    report_type_str = "INCIDENT"
                    
                report_text = row.get("report_text") or row.get("Final Narrative") or row.get("Summary")
                if not report_text:
                    continue
                    
                report_id = row.get("report_id")
                if not report_id:
                    report_id = f"OSHA-{uuid4().hex[:8].upper()}"

                payload = ReportCreate(
                    report_id=report_id,
                    report_type=ReportType(report_type_str),
                    report_text=report_text,
                    site_id=site.id,
                    location=row.get("location", "Unknown"),
                    department=row.get("department", "Unknown"),
                    activity=row.get("activity"),
                    reported_at=datetime.now(timezone.utc),
                    source_type=SourceType.IMPORTED
                )
                
                try:
                    await report_service.create(payload, user_id=user.id, ip_address="127.0.0.1")
                    count += 1
                    if count % 100 == 0:
                        print(f"Imported {count} reports...")
                except Exception as e:
                    print(f"Skipping {report_id}: {e}")
                    
        print(f"Successfully imported {count} reports.")

if __name__ == "__main__":
    asyncio.run(main())
