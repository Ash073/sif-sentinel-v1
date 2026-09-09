from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str = "sif-backend"


class CorrectiveActionSummary(BaseModel):
    total: int
    open: int
    overdue: int
    completed: int

class DashboardSummary(BaseModel):
    total_reports: int
    total_sif_reports: int
    high_risk_reports: int
    review_required: int
    active_precursors: int
    sites_monitored: int
    sif_rate: float
    high_risk_rate: float
    review_queue_count: int
    corrective_actions: CorrectiveActionSummary


class TimeSeriesPoint(BaseModel):
    date: str
    total_reports: int
    sif_reports: int
    high_sif_reports: int
    sif_rate: float


class DistributionItem(BaseModel):
    name: str
    count: int
    sif_count: int
    sif_density: float
    percentage: float = 0.0


class BarrierFailurePoint(BaseModel):
    date: str
    failed_count: int
