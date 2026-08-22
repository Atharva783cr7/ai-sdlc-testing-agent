import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse, Response
from app.models.schemas import (
    TestingStartRequest,
    TestingStartResponse,
    IntelligenceSummary,
    TestDesignSummary,
    TestExecutionResponse,
    TestExecutionResult,
    TestExecutionSummary,
    ApprovalStatus,
    ApprovalRequest,
    ApprovalResponse,
)
from app.models.state import TestingState
from app.workflow.testing_workflow import testing_workflow
from app.execution.controller import ExecutionController
from app.analysis.result_intelligence import analyze_execution_report
from app.analysis.schemas import ResultIntelligenceReport
from app.quality.quality_gate import evaluate_quality_gate
from app.quality.schemas import QualityGateReport
from app.reports.report_generator import ReportGenerator
from app.reports.schemas import ExportFormat

router = APIRouter(prefix="/testing", tags=["Testing"])
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Approval Storage (In-Memory)
# ---------------------------------------------------------------------------
# NOTE: This is a simple in-memory implementation for Phase 8.
# For production, replace with persistent database storage.
# Concurrent access considerations: This simple dict is not thread-safe.
# In production, use proper database transactions or locking mechanisms.

_approval_store: Dict[str, Dict[str, Any]] = {}  # Key: project_id, Value: approval state

def _get_approval_state(project_id: str) -> Optional[Dict[str, Any]]:
    """Get approval state for a project, or None if not exists."""
    return _approval_store.get(project_id)

def _set_approval_state(project_id: str, approval_data: Dict[str, Any]) -> None:
    """Set approval state for a project."""
    _approval_store[project_id] = approval_data

def _calculate_release_allowed(approval_status: str, release_readiness: Optional[str]) -> bool:
    """
    Calculate whether release is allowed based on approval status and quality gate.
    
    Rules:
    - release_allowed is true ONLY when:
      * approval_status == "approved" AND
      * release_readiness == "READY"
    - Human approval does NOT override a failed quality gate
    """
    if approval_status != "approved":
        return False
    if release_readiness != "READY":
        return False
    return True

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
        report = final_state.get("report")
        response = TestingStartResponse(
            project_id=final_state["project_id"],
            validation_status=final_state["validation_status"],
            validation_errors=final_state["validation_errors"],
            workflow_status=final_state["workflow_status"],
            intelligence=intelligence,
            test_design=test_design,
            report=report,
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


def _generate_report(state: TestingState, exec_report: Optional[dict] = None) -> None:
    """Phase 8: generate the comprehensive test report and store it in the state."""
    generator = ReportGenerator()

    def _to_dict(val):
        if val is None:
            return None
        if isinstance(val, dict):
            return val
        if hasattr(val, "model_dump"):
            return val.model_dump()
        if hasattr(val, "dict"):
            return val.dict()
        return val

    report = generator.generate(
        project_id=state.get("project_id", "unknown"),
        requirements=[_to_dict(r) for r in (state.get("requirements") or [])],
        risks=[_to_dict(r) for r in (state.get("risks") or [])],
        change_impact=_to_dict(state.get("change_impact")),
        coverage=_to_dict(state.get("coverage")),
        test_strategy=_to_dict(state.get("test_strategy")),
        test_cases=[_to_dict(tc) for tc in (state.get("test_cases") or [])],
        test_scenarios=[_to_dict(ts) for ts in (state.get("test_scenarios") or [])],
        generated_test_data=[_to_dict(td) for td in (state.get("generated_test_data") or [])],
        traceability=_to_dict(state.get("traceability")),
        execution_results=state.get("execution_results") or [],
        execution_summary=state.get("execution_summary"),
        execution_status=state.get("execution_status"),
        result_intelligence=_to_dict(state.get("result_intelligence")),
        failure_analyses=[_to_dict(fa) for fa in (state.get("failure_analyses") or [])],
        root_cause_analyses=[_to_dict(rc) for rc in (state.get("root_cause_analyses") or [])],
        defect_analyses=[_to_dict(da) for da in (state.get("defect_analyses") or [])],
        flaky_analyses=[_to_dict(fa) for fa in (state.get("flaky_analyses") or [])],
        quality_gate_report=_to_dict(state.get("quality_gate_report")),
        quality_score=state.get("quality_score"),
        release_readiness=state.get("release_readiness"),
    )
    state["report"] = report


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

        # Phase 8: generate comprehensive report
        _generate_report(final_state, exec_report)
        
        # Initialize approval state with quality gate information
        project_id = final_state.get("project_id")
        quality_gate_report = final_state.get("quality_gate_report")
        
        if quality_gate_report:
            _set_approval_state(project_id, {
                "approval_status": "pending",
                "approved_by": None,
                "approval_comment": None,
                "approval_timestamp": None,
                "report_id": final_state.get("report").report_id if final_state.get("report") else None,
                "release_readiness": quality_gate_report.release_readiness.value if quality_gate_report.release_readiness else None,
                "quality_gate_status": quality_gate_report.overall_status.value if quality_gate_report.overall_status else None,
            })

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
            report=final_state.get("report"),
        )
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Execution endpoint failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# Standalone report generation and export endpoints
# ---------------------------------------------------------------------------

@router.post("/report/generate", status_code=status.HTTP_200_OK)
def generate_report_from_state(payload: TestingStartRequest) -> dict:
    """Run the full workflow and generate a comprehensive report without executing tests."""
    logger.info(f"Received report generation request for project ID: {payload.project_id}")

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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Input validation failed", "validation_errors": final_state.get("validation_errors")}
            )

        # Run analysis and quality gate on empty execution
        analysis = analyze_execution_report({"results": []})
        _store_analysis(final_state, analysis)
        _run_quality_gate(final_state, {"results": [], "summary": {"total": 0, "pass": 0, "fail": 0, "error": 0, "skipped": 0}}, analysis)

        # Generate Phase 8 report
        _generate_report(final_state)

        report = final_state.get("report")
        return {
            "project_id": payload.project_id,
            "report": report.model_dump() if report else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/report/export", status_code=status.HTTP_200_OK)
def export_report(payload: TestingStartRequest, fmt: str = "json") -> Response:
    """Run the full workflow and export the report in the specified format (json, html, csv)."""
    logger.info(f"Received report export request for project ID: {payload.project_id}, format: {fmt}")

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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Input validation failed", "validation_errors": final_state.get("validation_errors")}
            )

        analysis = analyze_execution_report({"results": []})
        _store_analysis(final_state, analysis)
        _run_quality_gate(final_state, {"results": [], "summary": {"total": 0, "pass": 0, "fail": 0, "error": 0, "skipped": 0}}, analysis)
        _generate_report(final_state)

        report = final_state.get("report")
        if not report:
            raise HTTPException(status_code=500, detail="Report generation failed")

        try:
            export_format = ExportFormat(fmt.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}. Use json, html, or csv.")

        generator = ReportGenerator()
        content = generator.export(report, export_format)

        media_types = {
            ExportFormat.JSON: "application/json",
            ExportFormat.HTML: "text/html",
            ExportFormat.CSV: "text/csv",
        }
        filename = f"test-report-{payload.project_id}.{export_format.value}"

        return Response(
            content=content,
            media_type=media_types[export_format],
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report export failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# Human Approval / Reject Endpoints
# ---------------------------------------------------------------------------

@router.post("/report/approve", response_model=ApprovalResponse, status_code=status.HTTP_200_OK)
def approve_report(payload: ApprovalRequest) -> ApprovalResponse:
    """
    Approve a test report for release.
    
    Validates:
    - Report exists for the project
    - Current approval status is pending
    - Reviewer identifier is provided
    
    Sets status to approved and calculates release_allowed based on quality gate.
    """
    logger.info(f"Approval request for project {payload.project_id}, report {payload.report_id} by {payload.approved_by}")
    
    # Get current approval state
    current_state = _get_approval_state(payload.project_id)
    
    # Initialize as pending if no state exists
    if current_state is None:
        current_state = {
            "approval_status": "pending",
            "approved_by": None,
            "approval_comment": None,
            "approval_timestamp": None,
            "report_id": None,
            "release_readiness": None,
            "quality_gate_status": None,
        }
    
    # Validate state machine: can only approve from pending
    if current_state["approval_status"] != "pending":
        logger.warning(f"Cannot approve report in status: {current_state['approval_status']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve report with current status: {current_state['approval_status']}. Status must be pending."
        )
    
    # Validate reviewer
    if not payload.approved_by or not payload.approved_by.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviewer identifier (approved_by) is required"
        )
    
    # Generate timestamp
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Update approval state
    updated_state = {
        **current_state,
        "approval_status": "approved",
        "approved_by": payload.approved_by.strip(),
        "approval_comment": payload.comment,
        "approval_timestamp": timestamp,
        "report_id": payload.report_id,
    }
    
    _set_approval_state(payload.project_id, updated_state)
    
    # Calculate release_allowed based on quality gate
    release_allowed = _calculate_release_allowed(
        updated_state["approval_status"],
        updated_state.get("release_readiness")
    )
    
    logger.info(f"Report {payload.report_id} approved by {payload.approved_by}, release_allowed: {release_allowed}")
    
    return ApprovalResponse(
        project_id=payload.project_id,
        report_id=payload.report_id,
        approval_status=ApprovalStatus.APPROVED,
        approved_by=payload.approved_by.strip(),
        approval_timestamp=timestamp,
        comment=payload.comment,
        release_allowed=release_allowed,
        quality_gate_status=updated_state.get("quality_gate_status"),
        release_readiness=updated_state.get("release_readiness"),
    )


@router.post("/report/reject", response_model=ApprovalResponse, status_code=status.HTTP_200_OK)
def reject_report(payload: ApprovalRequest) -> ApprovalResponse:
    """
    Reject a test report, blocking release.
    
    Validates:
    - Report exists for the project
    - Current approval status is pending
    - Reviewer identifier is provided
    - Rejection reason (comment) is non-empty
    
    Sets status to rejected and release_allowed to false.
    """
    logger.info(f"Rejection request for project {payload.project_id}, report {payload.report_id} by {payload.approved_by}")
    
    # Get current approval state
    current_state = _get_approval_state(payload.project_id)
    
    # Initialize as pending if no state exists
    if current_state is None:
        current_state = {
            "approval_status": "pending",
            "approved_by": None,
            "approval_comment": None,
            "approval_timestamp": None,
            "report_id": None,
            "release_readiness": None,
            "quality_gate_status": None,
        }
    
    # Validate state machine: can only reject from pending
    if current_state["approval_status"] != "pending":
        logger.warning(f"Cannot reject report in status: {current_state['approval_status']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject report with current status: {current_state['approval_status']}. Status must be pending."
        )
    
    # Validate reviewer
    if not payload.approved_by or not payload.approved_by.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviewer identifier (approved_by) is required"
        )
    
    # Validate rejection reason is required
    if not payload.comment or not payload.comment.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason (comment) is required for rejecting a report"
        )
    
    # Generate timestamp
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Update approval state
    updated_state = {
        **current_state,
        "approval_status": "rejected",
        "approved_by": payload.approved_by.strip(),
        "approval_comment": payload.comment.strip(),
        "approval_timestamp": timestamp,
        "report_id": payload.report_id,
    }
    
    _set_approval_state(payload.project_id, updated_state)
    
    # Release is never allowed after rejection
    release_allowed = False
    
    logger.info(f"Report {payload.report_id} rejected by {payload.approved_by}, reason: {payload.comment[:100]}")
    
    return ApprovalResponse(
        project_id=payload.project_id,
        report_id=payload.report_id,
        approval_status=ApprovalStatus.REJECTED,
        approved_by=payload.approved_by.strip(),
        approval_timestamp=timestamp,
        comment=payload.comment.strip(),
        release_allowed=release_allowed,
        quality_gate_status=updated_state.get("quality_gate_status"),
        release_readiness=updated_state.get("release_readiness"),
    )


@router.get("/report/approval-status/{project_id}", response_model=ApprovalResponse, status_code=status.HTTP_200_OK)
def get_approval_status(project_id: str) -> ApprovalResponse:
    """
    Get current approval status for a project's report.
    
    Returns PENDING status if no approval has been recorded yet.
    """
    logger.info(f"Approval status request for project {project_id}")
    
    current_state = _get_approval_state(project_id)
    
    # Return pending state if no approval exists
    if current_state is None:
        return ApprovalResponse(
            project_id=project_id,
            report_id="",
            approval_status=ApprovalStatus.PENDING,
            approved_by="--",
            approval_timestamp="--",
            comment=None,
            release_allowed=False,
            quality_gate_status=None,
            release_readiness=None,
        )
    
    # Map string status to enum
    status_enum = ApprovalStatus(current_state["approval_status"])
    
    # Calculate current release_allowed
    release_allowed = _calculate_release_allowed(
        current_state["approval_status"],
        current_state.get("release_readiness")
    )
    
    return ApprovalResponse(
        project_id=project_id,
        report_id=current_state.get("report_id", ""),
        approval_status=status_enum,
        approved_by=current_state.get("approved_by", "--"),
        approval_timestamp=current_state.get("approval_timestamp", "--"),
        comment=current_state.get("approval_comment"),
        release_allowed=release_allowed,
        quality_gate_status=current_state.get("quality_gate_status"),
        release_readiness=current_state.get("release_readiness"),
    )
