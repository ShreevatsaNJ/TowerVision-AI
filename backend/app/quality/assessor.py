import cv2
import numpy as np
from app.quality.metrics import (
    compute_laplacian_variance,
    compute_brightness_mean,
    compute_contrast_rms,
    compute_exposure_clipping
)
from app.quality.rules import evaluate_quality_rules
from app.schemas.quality import QualityMetrics, QualityDecision
from app.config import settings

class ImageQualityAssessor:
    """
    Stage 1 Quality Assessment Engine.
    Evaluates whether a tower image is sharp, well-lit, and suitable for YOLO detection.
    """
    
    @staticmethod
    def assess_image(image_bytes: bytes) -> QualityDecision:
        # Decode byte buffer to OpenCV image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            metrics = QualityMetrics(
                blur_score=0.0,
                brightness_mean=0.0,
                contrast_score=0.0,
                resolution=[0, 0],
                composite_health_score=0.0,
                is_sharp=False,
                is_well_lit=False,
                is_good_contrast=False,
                is_sufficient_resolution=False
            )
            return QualityDecision(
                is_usable=False,
                decision="BAD",
                metrics=metrics,
                rejection_reasons=["Image rejected: Cannot access or decode file. File is corrupt, unreadable, or not a supported image."],
                recommendations=["Re-upload a valid, uncorrupted JPEG, PNG, or WEBP image file."]
            )
            
        height, width = img.shape[:2]
        
        # Calculate raw CV metrics
        blur_score = compute_laplacian_variance(img)
        brightness = compute_brightness_mean(img)
        contrast = compute_contrast_rms(img)
        shadow_clip, highlight_clip = compute_exposure_clipping(img)
        
        # Evaluate rules and thresholds
        is_usable, reasons, recommendations, composite_score = evaluate_quality_rules(
            blur_score=blur_score,
            brightness=brightness,
            contrast=contrast,
            width=width,
            height=height,
            shadow_clip=shadow_clip,
            highlight_clip=highlight_clip
        )
        
        metrics = QualityMetrics(
            blur_score=blur_score,
            brightness_mean=brightness,
            contrast_score=contrast,
            resolution=[width, height],
            composite_health_score=composite_score,
            is_sharp=blur_score >= settings.MIN_LAPLACIAN_BLUR_SCORE,
            is_well_lit=settings.MIN_BRIGHTNESS <= brightness <= settings.MAX_BRIGHTNESS,
            is_good_contrast=contrast >= settings.MIN_CONTRAST_RMS,
            is_sufficient_resolution=width >= settings.MIN_IMAGE_WIDTH and height >= settings.MIN_IMAGE_HEIGHT
        )
        
        return QualityDecision(
            is_usable=is_usable,
            decision="GOOD" if is_usable else "BAD",
            metrics=metrics,
            rejection_reasons=reasons,
            recommendations=recommendations
        )

quality_assessor = ImageQualityAssessor()
