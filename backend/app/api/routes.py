import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Response, Depends
from fastapi.responses import FileResponse
from app.core.pipeline import pipeline
from app.quality.assessor import quality_assessor
from app.schemas.response import InspectionResponse
from app.schemas.quality import QualityDecision
from app.schemas.auth import AuthResponse, Credentials, LoginCredentials, SessionResponse
from app.config import settings
from app.services.auth_service import (
    AccountValidationError,
    InvalidCredentialsError,
    SESSION_COOKIE_NAME,
    SESSION_TTL_SECONDS,
    UsernameTakenError,
    auth_service,
    require_current_user,
)

router = APIRouter(prefix="/api/v1")

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

@router.post("/auth/signup", response_model=AuthResponse, status_code=201)
def sign_up(credentials: Credentials, response: Response):
    try:
        user = auth_service.register(credentials.username, credentials.password)
    except UsernameTakenError:
        raise HTTPException(status_code=409, detail="That username is already registered. Try logging in.")
    except AccountValidationError as error:
        raise HTTPException(status_code=422, detail=str(error))

    token, _ = auth_service.create_session(user["id"])
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"user": user}

@router.post("/auth/login", response_model=AuthResponse)
def log_in(credentials: LoginCredentials, response: Response):
    user = auth_service.authenticate(credentials.username, credentials.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    token, _ = auth_service.create_session(user["id"])
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"user": user}

@router.get("/auth/session", response_model=SessionResponse)
def check_session(request: Request):
    user = auth_service.get_user_for_session(request.cookies.get(SESSION_COOKIE_NAME))
    return {"user": user}

@router.post("/auth/logout")
def log_out(request: Request, response: Response):
    auth_service.revoke_session(request.cookies.get(SESSION_COOKIE_NAME))
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"status": "logged_out"}

@router.post("/inspect", response_model=InspectionResponse)
async def inspect_tower_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_current_user),
):
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
async def quality_check_only(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_current_user),
):
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
def download_pdf_report(inspection_id: str, current_user: dict = Depends(require_current_user)):
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
