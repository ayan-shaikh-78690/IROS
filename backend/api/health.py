from fastapi import APIRouter
from models.schemas import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    """
    Health check endpoint for VEDIORA backend service.
    Returns status: 'ok' and service identifier.
    """
    return HealthResponse(
        status="ok",
        service="vediora-backend"
    )
