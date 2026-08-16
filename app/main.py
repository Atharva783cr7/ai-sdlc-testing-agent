import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.testing import router as testing_router

# Configure logging format and level
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Smart Building Monitoring - Testing Agent Foundation",
    description="Phase 1: Input Validation and Context Loading workflow using LangGraph and FastAPI.",
    version="1.0.0"
)

# Minimal CORS configuration to allow frontend at http://localhost:8002
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8002"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Register routes
app.include_router(testing_router)

@app.get("/")
def root():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "agent": "testing-agent-foundation",
        "phase": 1
    }
