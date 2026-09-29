import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Application configuration settings for VEDIORA backend."""
    APP_NAME: str = "VEDIORA Backend"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    OSM_REGION: str = os.getenv("OSM_REGION", "Ahmedabad–Gandhinagar, Gujarat, India")
    NETWORK_TYPE: str = os.getenv("NETWORK_TYPE", "drive")
    
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    
    # Routing Engine Configuration (M2.2-A Isolated Provider Architecture)
    ROUTING_PROVIDER: str = os.getenv("ROUTING_PROVIDER", "OSRM")
    ROUTING_BASE_URL: str = os.getenv("ROUTING_BASE_URL", "https://router.project-osrm.org")
    ROUTING_TIMEOUT_SECONDS: float = float(os.getenv("ROUTING_TIMEOUT_SECONDS", "10.0"))

settings = Settings()
