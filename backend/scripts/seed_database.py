import asyncio
import csv
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add the project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.site import Site
from app.models.user import User
from app.models.report import Report
from app.core.constants import ReportType, SourceType, ReportStatus
from app.services.analysis.analysis_service import AnalysisService
from app.services.precursor_engine.precursor_service import PrecursorService
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        print("Connecting to database...")
        # Get or create a site
        site = await db.scalar(select(Site).limit(1))
        if not site:
            site = Site(name="Demo Plant Alpha", region="North America", timezone="UTC")
            db.add(site)
            await db.flush()
            print("Created Demo Plant Alpha site.")
        
        # Get or create a user
        user = await db.scalar(select(User).limit(1))
        if not user:
            from app.core.security import hash_password
            user = User(
                email="admin@sifsentinel.com",
                full_name="Admin User",
                role="ADMIN",
                password_hash=hash_password("admin123"),
                is_active=True
            )
            db.add(user)
            await db.flush()
            print("Created Admin User with password admin123.")
            
        await db.commit()

        # Read CSV
        csv_path = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "safety_reports.csv"
        print(f"Reading from {csv_path}...")
        
        count = 0
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if count >= 75:  # Load 75 reports to get a good distribution
                    break
                
                # Check if report already exists to be idempotent
                report_id = f"DEMO-{count:04d}"
                existing = await db.scalar(select(Report).where(Report.report_id == report_id))
                if existing:
                    count += 1
                    continue

                report_type_str = row.get("report_type", "INCIDENT")
                if not report_type_str:
                    report_type_str = "INCIDENT"

                report = Report(
                    report_id=report_id,
                    report_type=ReportType(report_type_str),
                    report_text=row["report_text"],
                    site_id=site.id,
                    location="Demo Unit",
                    department="Operations",
                    reported_at=datetime.now(timezone.utc),
                    source_type=SourceType.IMPORTED,
                    status=ReportStatus.NEW,
                    created_by=user.id
                )
                db.add(report)
                await db.flush()
                
                # Analyze Report
                try:
                    await AnalysisService(db).analyze_report(report.report_id, user.id, "127.0.0.1")
                    print(f"Analyzed {report_id}")
                except Exception as e:
                    print(f"Failed to analyze {report_id}: {e}")
                
                count += 1
                
        await db.commit()
        
        # Rebuild precursors
        print("Rebuilding precursor patterns...")
        await PrecursorService(db).rebuild(commit=True)
        await db.commit()
        
        print(f"Successfully seeded {count} reports and rebuilt patterns.")

if __name__ == "__main__":
    asyncio.run(main())
