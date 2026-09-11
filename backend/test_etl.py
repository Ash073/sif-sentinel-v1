import asyncio
import uuid
from app.tasks.etl_tasks import _process_csv_upload_async

async def run_test():
    with open("C:\\Users\\DHARSHAN\\Videos\\SIH - 2026\\January2015toNovember2025.csv", "r", encoding="utf-8") as f:
        content = f.read()
    
    print("File read successfully, starting ETL...")
    await _process_csv_upload_async(
        content=content,
        user_id_str="00000000-0000-0000-0000-000000000000",
        ip_address="127.0.0.1",
        task_id="test_task"
    )
    print("ETL finished successfully.")

if __name__ == "__main__":
    asyncio.run(run_test())
