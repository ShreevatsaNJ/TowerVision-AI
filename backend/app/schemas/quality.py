from typing import List, Optional
from pydantic import BaseModel, Field

class QualityMetrics(BaseModel):
    blur_score: float = Field(..., description="Laplacian variance sharpness score")
    brightness_mean: float = Field(..., description="Average luminance (0-255)")
    contrast_score: float = Field(..., description="RMS standard deviation of pixel intensities")
    resolution: List[int] = Field(..., description="[Width, Height] in pixels")
    composite_health_score: float = Field(..., description="Aggregate quality score from 0-100")
    is_sharp: bool
    is_well_lit: bool
    is_good_contrast: bool
    is_sufficient_resolution: bool

class QualityDecision(BaseModel):
    is_usable: bool = Field(..., description="Whether the image is suitable for AI detection")
    decision: str = Field(..., description="'GOOD' or 'BAD'")
    metrics: QualityMetrics
    rejection_reasons: List[str] = Field(default_factory=list, description="Specific failure reasons if rejected")
    recommendations: List[str] = Field(default_factory=list, description="Actionable advice for recapturing the image")
