import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.core.pipeline import pipeline
from app.quality.assessor import quality_assessor
from app.schemas.response import InspectionResponse
from app.schemas.quality import QualityDecision
from app.config import settings

router = APIRouter(prefix="/api/v1")

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

@router.post("/inspect", response_model=InspectionResponse)
async def inspect_tower_image(file: UploadFile = File(...)):
    """
    Full End-to-End Quality-Aware Inspection Pipeline:
    - Step 1: Validates quality metrics (blur, brightness, contrast).
    - Step 2: Gated YOLO Tower detection if quality passes.
    - Step 3: Returns full inspection payload and report link.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image format (JPEG/PNG/WEBP).")
        
    image_bytes = await file.read()
    
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
        
    try:
        response = pipeline.process_image(image_bytes=image_bytes, filename=file.filename)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline processing failed: {str(e)}")

@router.post("/quality-check", response_model=QualityDecision)
async def quality_check_only(file: UploadFile = File(...)):
    """
    Stage 1 only: Fast quality evaluation without running YOLO object detection.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image format.")
        
    image_bytes = await file.read()
    try:
        decision = quality_assessor.assess_image(image_bytes)
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality check failed: {str(e)}")

@router.get("/report/{inspection_id}")
def download_pdf_report(inspection_id: str):
    """
    Downloads the generated PDF inspection report for the given inspection ID.
    """
    pdf_filename = f"Inspection_Report_{inspection_id}.pdf"
    pdf_path = os.path.join(settings.REPORTS_DIR, pdf_filename)
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Inspection report not found.")
        
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_filename
    )
