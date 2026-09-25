import cv2
import numpy as np
from typing import List
from app.schemas.detection import DetectedObject, BoundingBox

CLASS_COLOR_MAP = {
    "tower": "#00d2ff",         # Cyan / Electric Blue
    "antenna": "#9d4edd",       # Purple
    "mount": "#38b000",         # Green
    "rust": "#ff0055",          # Red / Critical
    "defect": "#ff9e00",        # Orange / Warning
    "structural_bar": "#3a86ff",# Blue
    "cable": "#ffbe0b",         # Yellow
    "insulator": "#06d6a0"      # Teal
}

def hex_to_bgr(hex_str: str) -> tuple[int, int, int]:
    hex_clean = hex_str.lstrip('#')
    rgb = tuple(int(hex_clean[i:i+2], 16) for i in (0, 2, 4))
    return (rgb[2], rgb[1], rgb[0]) # BGR for OpenCV

def get_class_meta(class_name: str) -> tuple[str, str]:
    """Returns (color_hex, severity) for a given class"""
    lower = class_name.lower()
    for key, color in CLASS_COLOR_MAP.items():
        if key in lower:
            severity = "CRITICAL" if key in ["rust", "defect"] else "INFO"
            return color, severity
    return "#00d2ff", "INFO"

def draw_detection_overlay(image_np: np.ndarray, detections: List[DetectedObject]) -> np.ndarray:
    """
    Renders high-contrast, professional bounding boxes and labels onto the image.
    """
    annotated = image_np.copy()
    
    for det in detections:
        b = det.bbox
        x1, y1, x2, y2 = int(b.x_min), int(b.y_min), int(b.x_max), int(b.y_max)
        color_bgr = hex_to_bgr(det.color)
        
        # 1. Draw rounded/semi-transparent bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color_bgr, 2)
        
        # 2. Draw label background badge
        label_text = f"{det.class_name.upper()} {int(det.confidence * 100)}%"
        (tw, th), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        
        badge_y1 = max(0, y1 - th - 10)
        badge_y2 = y1
        cv2.rectangle(annotated, (x1, badge_y1), (x1 + tw + 12, badge_y2), color_bgr, -1)
        
        # 3. Label text
        cv2.putText(
            annotated,
            label_text,
            (x1 + 6, badge_y2 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 0, 0),
            1,
            cv2.LINE_AA
        )
        
    return annotated
