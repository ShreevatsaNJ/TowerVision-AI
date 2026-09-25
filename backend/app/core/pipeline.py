import os
import uuid
from datetime import datetime
import cv2
import numpy as np
from app.config import settings
from app.quality.assessor import quality_assessor
from app.detection.detector import tower_detector
from app.services.report_generator import generate_pdf_report
from app.schemas.response import InspectionResponse

class TowerVisionPipeline:
    """
    Quality-Aware AI Pipeline:
    1. Validate & Assess Image Quality
    2. Quality Gate: BAD -> Reject immediately (saving compute)
    3. GOOD -> Trigger YOLO Object Detection & Overlay Rendering
    4. Result Aggregation & Report Creation
    """
    
    @staticmethod
    def process_image(image_bytes: bytes, filename: str) -> InspectionResponse:
        inspection_id = str(uuid.uuid4())[:8]
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        
        # Save original file
        orig_ext = os.path.splitext(filename)[1] or ".jpg"
        orig_filename = f"{inspection_id}_orig{orig_ext}"
        orig_path = os.path.join(settings.UPLOAD_DIR, orig_filename)
        with open(orig_path, "wb") as f:
            f.write(image_bytes)
            
        orig_url = f"/storage/uploads/{orig_filename}"
        
        # 1. Stage 1: Quality Assessment
        quality_decision = quality_assessor.assess_image(image_bytes)
        
        # 2. Gate Decision
        if not quality_decision.is_usable:
            # BAD Quality -> REJECT
            pdf_path = generate_pdf_report(
                inspection_id=inspection_id,
                filename=filename,
                quality_data=quality_decision.model_dump()
            )
            report_url = f"/api/v1/report/{inspection_id}"
            
            return InspectionResponse(
                inspection_id=inspection_id,
                filename=filename,
                status="REJECTED_BAD_QUALITY",
                processed_at=timestamp,
                quality_assessment=quality_decision,
                detection_summary=None,
                annotated_image_url=None,
                original_image_url=orig_url,
                report_download_url=report_url,
                overall_health_status="REJECTED"
            )
            
        # 3. GOOD Quality -> Run YOLO Detection
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        detection_summary, annotated_img_np = tower_detector.detect(img_np)
        
        # Save annotated image
        annotated_filename = f"{inspection_id}_annotated.jpg"
        annotated_path = os.path.join(settings.PROCESSED_DIR, annotated_filename)
        cv2.imwrite(annotated_path, annotated_img_np)
        annotated_url = f"/storage/processed/{annotated_filename}"
        
        # 4. Generate PDF Report
        generate_pdf_report(
            inspection_id=inspection_id,
            filename=filename,
            quality_data=quality_decision.model_dump(),
            detection_data=detection_summary.model_dump()
        )
        report_url = f"/api/v1/report/{inspection_id}"
        
        no_tower_detected = detection_summary.total_objects == 0
        health_status = (
            "NO_TOWER_DETECTED" if no_tower_detected
            else "WARNING_DEFECTS_FOUND" if detection_summary.has_defects
            else "OPTIMAL"
        )
        
        return InspectionResponse(
            inspection_id=inspection_id,
            filename=filename,
            status="REJECTED_NO_DETECTIONS" if no_tower_detected else "COMPLETED_ACCEPTED",
            processed_at=timestamp,
            quality_assessment=quality_decision,
            detection_summary=detection_summary,
            annotated_image_url=annotated_url,
            original_image_url=orig_url,
            report_download_url=report_url,
            overall_health_status=health_status
        )

pipeline = TowerVisionPipeline()
