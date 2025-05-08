"""General routes for application status and information."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_api_info():
    """Root endpoint with basic information about the API."""
    return {
        "name": "Humble Clay",
        "description": "AI-powered Google Sheets add-on",
        "version": "0.1.0",
    }


@router.get("/health")
async def check_health():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}
