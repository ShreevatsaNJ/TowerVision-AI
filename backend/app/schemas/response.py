from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.quality import QualityDecision
from app.schemas.detection import DetectionSummary

class InspectionResponse(BaseModel):
    inspection_id: str
    filename: str
    status: str = Field(..., description="'COMPLETED_ACCEPTED', 'REJECTED_BAD_QUALITY', or 'REJECTED_NO_DETECTIONS'")
    processed_at: str
    quality_assessment: QualityDecision
    detection_summary: Optional[DetectionSummary] = None
    annotated_image_url: Optional[str] = None
    original_image_url: str
    report_download_url: Optional[str] = None
    overall_health_status: str = Field(..., description="'REJECTED', 'NO_TOWER_DETECTED', 'WARNING_DEFECTS_FOUND', or 'OPTIMAL'")
