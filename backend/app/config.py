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
    
    # Quality Thresholds
    MIN_LAPLACIAN_BLUR_SCORE: float = 100.0  # Scores below 100 indicate blurry images
    MIN_BRIGHTNESS: float = 40.0             # Mean luminance (0-255). Below 40 is underexposed
    MAX_BRIGHTNESS: float = 220.0            # Above 220 is overexposed/washed out
    MIN_CONTRAST_RMS: float = 25.0           # Standard deviation of pixel intensities
    MIN_IMAGE_WIDTH: int = 400
    MIN_IMAGE_HEIGHT: int = 400
    MAX_IMAGE_SIZE_MB: int = 25
    
    # YOLO Object Detection Configuration
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
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
