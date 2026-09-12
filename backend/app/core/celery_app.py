from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "sif_tasks",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.etl_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # task_always_eager=True  # Bypasses Redis completely for local hackathon demo!
)
