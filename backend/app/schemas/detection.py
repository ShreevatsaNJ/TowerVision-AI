from typing import List, Dict
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x_min: float = Field(..., description="Top-left X coordinate")
    y_min: float = Field(..., description="Top-left Y coordinate")
    x_max: float = Field(..., description="Bottom-right X coordinate")
    y_max: float = Field(..., description="Bottom-right Y coordinate")
    width: float
    height: float

class DetectedObject(BaseModel):
    id: int
    class_name: str = Field(..., description="Detected class (e.g., Tower, Antenna, Rust, Mount)")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    bbox: BoundingBox
    severity: str = Field(default="INFO", description="Severity level: INFO, WARNING, CRITICAL")
    color: str = Field(default="#00ffcc", description="HEX color for visualization")

class DetectionSummary(BaseModel):
    total_objects: int
    class_counts: Dict[str, int]
    detections: List[DetectedObject]
    has_defects: bool
    inference_time_ms: float
