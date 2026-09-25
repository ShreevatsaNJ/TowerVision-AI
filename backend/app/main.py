import os
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.api.routes import router as api_router
from app.services.auth_service import require_current_user

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Tower Image Quality Assessment & Intelligent Detection Platform"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Endpoints
app.include_router(api_router)

storage_root = Path(os.path.join(os.path.dirname(__file__), "..", "..", "storage")).resolve()

@app.get("/storage/{file_path:path}", include_in_schema=False)
def serve_storage_file(file_path: str, current_user: dict = Depends(require_current_user)):
    requested_path = (storage_root / file_path).resolve()
    try:
        requested_path.relative_to(storage_root)
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found.")
    if not requested_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(requested_path)

# Mount Frontend static files
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
