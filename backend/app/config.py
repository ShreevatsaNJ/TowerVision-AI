import os
from pydantic import BaseModel

class Settings(BaseModel):
    # App Information
    APP_NAME: str = "TowerVision AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Quality Thresholds — Only reject truly unanalyzable images
    MIN_LAPLACIAN_BLUR_SCORE: float = 15.0   # Only reject extreme blur (canvas-generated blur test ~0-10)
    MIN_BRIGHTNESS: float = 8.0              # Only reject near-pitch-black images
    MAX_BRIGHTNESS: float = 248.0            # Only reject completely washed out white
    MIN_CONTRAST_RMS: float = 5.0            # Only reject flat uniform color images
    MIN_IMAGE_WIDTH: int = 100
    MIN_IMAGE_HEIGHT: int = 100
    MAX_IMAGE_SIZE_MB: int = 25
    
    # YOLO Object Detection Configuration
    YOLO_MODEL_PATH: str = os.getenv(
        "YOLO_MODEL_PATH",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ML Model.zip"))
    )
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    
    # Storage & Upload Paths
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "uploads")
    PROCESSED_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "processed")
    REPORTS_DIR: str = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "reports")

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
