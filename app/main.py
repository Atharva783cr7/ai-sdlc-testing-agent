import logging
from fastapi import FastAPI
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
