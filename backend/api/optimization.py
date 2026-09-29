from fastapi import APIRouter, HTTPException
from models.schemas import OptimizationJobRequest, OptimizationJobResponse

router = APIRouter(prefix="/optimization", tags=["Optimization"])

@router.get("/")
def get_optimization_status():
    """
    Optimization API status.
    Optimization engine is scheduled for implementation in Milestone 4.
    """
    return {
        "status": "planned",
        "milestone": "Milestone 4",
        "supported_algorithms": ["pso", "qpso"],
        "message": "Metaheuristic optimization engine will be connected in Milestone 4. No fake results are generated."
    }

@router.post("/run", response_model=OptimizationJobResponse)
def run_optimization(request: OptimizationJobRequest):
    """
    Endpoint for submitting an optimization job.
    In Milestone 1, returns HTTP 501 Not Implemented to prevent fake optimization claims.
    """
    raise HTTPException(
        status_code=501,
        detail="Optimization engine will be implemented in Milestone 4 (PSO / QPSO). Fake results are strictly avoided."
    )
