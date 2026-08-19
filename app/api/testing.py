import logging
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import (
    TestingStartRequest,
    TestingStartResponse,
    IntelligenceSummary,
    TestDesignSummary,
    TestExecutionResponse,
    TestExecutionResult,
    TestExecutionSummary,
)
from app.models.state import TestingState
from app.workflow.testing_workflow import testing_workflow
from app.execution.controller import ExecutionController
from app.analysis.result_intelligence import analyze_execution_report
from app.analysis.schemas import ResultIntelligenceReport
from app.quality.quality_gate import evaluate_quality_gate
from app.quality.schemas import QualityGateReport

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


def _store_analysis(state: TestingState, analysis: ResultIntelligenceReport) -> None:
    """Persist Phase 6 analysis artifacts into the workflow state."""
    state["result_intelligence"] = analysis
    state["failure_analyses"] = analysis.failures
    state["root_cause_analyses"] = analysis.root_causes
    state["defect_analyses"] = analysis.defects
    state["flaky_analyses"] = analysis.flaky_tests


def _store_quality_gate(state: TestingState, report: QualityGateReport) -> None:
    """Persist the Phase 7 quality gate decision into the workflow state."""
    state["quality_gate_report"] = report
    state["quality_score"] = report.quality_score
    state["release_readiness"] = report.release_readiness.value


def _run_quality_gate(state: TestingState, exec_report: dict, analysis: ResultIntelligenceReport) -> QualityGateReport:
    """Phase 7: evaluate the quality gates over Phase 2/5/6 evidence."""
    report = evaluate_quality_gate(
        execution_report=exec_report,
        analysis=analysis,
        coverage=state.get("coverage"),
        risks=state.get("risks"),
        test_cases=state.get("test_cases"),
        traceability=state.get("traceability"),
    )
    _store_quality_gate(state, report)
    return report


@router.post("/execute", response_model=TestExecutionResponse, status_code=status.HTTP_200_OK)
def execute_test_cases_from_workflow(payload: TestingStartRequest) -> TestExecutionResponse:
    """Run the full workflow (Phases 1-3) and execute Phase 3 generated test cases.

    This endpoint invokes the existing LangGraph workflow to produce the
    `test_cases` artifacts and then runs them through the single
    `ExecutionController`. Execution is simulated by the Phase 4 modules and
    clearly labeled as simulation; this endpoint does not perform real
    execution against external systems.
    """
    logger.info(f"Received execute request for project ID: {payload.project_id}")

    # Prepare initial state similar to /start
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
        "requirements": [],
        "risks": [],
        "change_impact": None,
        "coverage": None,
        "test_strategy": None,
        "test_cases": [],
        "test_scenarios": [],
        "generated_test_data": [],
        "traceability": None,
        "test_design_warnings": [],
    }

    try:
        final_state = testing_workflow.invoke(initial_state)

        if final_state.get("validation_status") != "passed":
            # Do not attempt execution if validation failed
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Input validation failed; cannot execute test cases.", "validation_errors": final_state.get("validation_errors")}
            )

        # Extract test cases from final_state; they may be Pydantic models or dicts
        raw_cases = final_state.get("test_cases") or []

        # If no executable test cases were generated, record a non-error execution state
        if not raw_cases:
            final_state["execution_status"] = "no_tests"
            final_state["execution_results"] = []
            final_state["execution_summary"] = {"total": 0, "pass": 0, "fail": 0, "error": 0, "skipped": 0}

            analysis = analyze_execution_report({"results": []})
            _store_analysis(final_state, analysis)
            quality_gate_report = _run_quality_gate(
                final_state,
                {"results": [], "summary": final_state["execution_summary"]},
                analysis,
            )

            summary = TestExecutionSummary(total=0, passed=0, failed=0, errors=0, skipped=0)
            response = TestExecutionResponse(
                project_id=final_state.get("project_id"),
                execution_status=final_state.get("execution_status"),
                execution_summary=summary,
                results=[],
                analysis=analysis,
                quality_gate=quality_gate_report,
            )
            return response

        # Normalize to plain dicts
        normalized_cases = []
        for c in raw_cases:
            try:
                # Pydantic BaseModel have model_dump
                if hasattr(c, "model_dump"):
                    normalized_cases.append(c.model_dump())
                else:
                    normalized_cases.append(dict(c))
            except Exception:
                # Fallback: ensure it's a dict-like
                normalized_cases.append(c)

        controller = ExecutionController()
        exec_report = controller.execute_test_suite(normalized_cases)

        # Persist execution results back into the workflow state for observability
        # Ensure final_state stores plain serializable structures
        final_state["execution_status"] = "completed"
        final_state["execution_results"] = exec_report.get("results", [])
        final_state["execution_summary"] = exec_report.get("summary", {})

        # Phase 6: derive result intelligence from the Phase 5 execution report
        analysis = analyze_execution_report(exec_report)
        _store_analysis(final_state, analysis)

        # Phase 7: quality gate and release readiness over Phase 2/5/6 evidence
        quality_gate_report = _run_quality_gate(final_state, exec_report, analysis)

        # Map summary keys
        summary_map = exec_report.get("summary", {})
        summary = TestExecutionSummary(
            total=summary_map.get("total", 0),
            passed=summary_map.get("pass", 0),
            failed=summary_map.get("fail", 0),
            errors=summary_map.get("error", 0),
            skipped=summary_map.get("skipped", 0),
        )

        results = []
        for r in exec_report.get("results", []):
            results.append(TestExecutionResult(
                test_case_id=r.get("test_case_id"),
                name=r.get("name"),
                status=r.get("status"),
                details=r.get("details"),
                module=r.get("module"),
                duration=r.get("duration"),
                attempts=r.get("attempts"),
                logs=r.get("logs") or [],
                artifacts=r.get("artifacts") or [],
                screenshot=r.get("screenshot"),
                # New structured fields (optional, backwards-compatible)
                attempts_detail=r.get("attempts_detail") or r.get("attempts_detail") or r.get("attempts_detail", None) or r.get("attempts_detail", None),
                artifacts_meta=r.get("artifacts_meta") or r.get("artifacts_meta", None),
                screenshot_meta=r.get("screenshot_meta") or r.get("screenshot_meta", None),
            ))
        response = TestExecutionResponse(
            project_id=final_state.get("project_id"),
            execution_status=final_state.get("execution_status"),
            execution_summary=summary,
            results=results,
            # Run-level metadata (optional)
            run_id=exec_report.get("run_id"),
            started_at=exec_report.get("started_at"),
            completed_at=exec_report.get("completed_at"),
            duration=exec_report.get("duration"),
            platform=exec_report.get("platform"),
            python_version=exec_report.get("python_version"),
            max_retries=exec_report.get("max_retries"),
            max_workers=exec_report.get("max_workers"),
            analysis=analysis,
            quality_gate=quality_gate_report,
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Execution endpoint failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
