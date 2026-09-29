"""
VEDIORA - Quantum-Inspired Intelligent Traffic Route Optimization
FastAPI Backend Application
SIH 2026 Problem Statement: 26137
Milestone 1: Professional Product Foundation + Application Shell
"""
import sys
import os

# Ensure current directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from api.health import router as health_router
from api.routes import router as routes_router
from api.optimization import router as optimization_router
from api.vrp import router as vrp_router
from api.scenarios import router as scenarios_router

app = FastAPI(
    title="IROS - Intelligent Route Optimization System",
    description="Backend API for IROS: Quantum-Inspired Traffic & Fleet Routing. Built by Team VEDIORA for SIH 2026 (PS 26137).",
    version="1.0.0-milestone1",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
# Health check endpoint mounted at root level as well for GET /health requirement
app.include_router(health_router)
app.include_router(routes_router, prefix="/api")
app.include_router(optimization_router, prefix="/api")
app.include_router(vrp_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")

@app.get("/")
def root():
    return {
        "product": "IROS",
        "full_name": "Intelligent Route Optimization System",
        "descriptor": "Quantum-Inspired Traffic & Fleet Routing",
        "team": "Team VEDIORA",
        "event": "Smart India Hackathon 2026",
        "problem_statement": "26137",
        "milestone": "Milestone 1",
        "status": "operational",
        "health": "/health",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
