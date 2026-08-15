import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import TestingStartRequest, TestingStartResponse, IntelligenceSummary, TestDesignSummary
from app.models.state import TestingState
from app.workflow.testing_workflow import testing_workflow

router = APIRouter(prefix="/testing", tags=["Testing"])
logger = logging.getLogger(__name__)

@router.post("/start", response_model=TestingStartResponse, status_code=status.HTTP_200_OK)
def start_testing_workflow(payload: TestingStartRequest) -> TestingStartResponse:
    """
    Starts the Testing Agent workflow.
    Validates inputs, normalizes context, and returns validation status and structured testing intelligence.
    """
    logger.info(f"Received start request for project ID: {payload.project_id}")

    # Prepare the initial state dict matching the TestingState schema
    initial_state: TestingState = {
        "project_id": payload.project_id,
        "srs": payload.srs,
        "sdd": payload.sdd,
        "source_code": payload.source_code,
        "api_docs": payload.api_docs,
        "database_schema": payload.database_schema,
        "test_data": payload.test_data,
        "environment": payload.environment,
        "validation_status": "pending",
        "validation_errors": [],
        "context": {},
        "workflow_status": "pending",
        "human_feedback": None,
        
        # Initialize Phase 2 fields as empty/None
        "requirements": [],
        "risks": [],
        "change_impact": None,
        "coverage": None,
        "test_strategy": None,

        # Initialize Phase 3 fields
        "test_cases": [],
        "test_scenarios": [],
        "generated_test_data": [],
        "traceability": None,
        "test_design_warnings": [],
    }

    try:
        # Run LangGraph workflow synchronously
        final_state = testing_workflow.invoke(initial_state)

        # Assemble IntelligenceSummary if validation passed and workflow finished
        intelligence = None
        test_design = None
        if final_state.get("validation_status") == "passed":
            intelligence = IntelligenceSummary(
                requirements=final_state.get("requirements") or [],
                risks=final_state.get("risks") or [],
                change_impact=final_state.get("change_impact"),
                coverage=final_state.get("coverage"),
                test_strategy=final_state.get("test_strategy")
            )
            test_design = TestDesignSummary(
                test_cases=final_state.get("test_cases") or [],
                test_scenarios=final_state.get("test_scenarios") or [],
                generated_test_data=final_state.get("generated_test_data") or [],
                traceability=final_state.get("traceability"),
                warnings=final_state.get("test_design_warnings") or [],
            )

        # Build response schema from the resulting state
        response = TestingStartResponse(
            project_id=final_state["project_id"],
            validation_status=final_state["validation_status"],
            validation_errors=final_state["validation_errors"],
            workflow_status=final_state["workflow_status"],
            intelligence=intelligence,
            test_design=test_design,
        )
        return response

    except Exception as e:
        logger.error(f"Unexpected exception during workflow execution: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Testing agent workflow execution failed: {str(e)}"
        )
