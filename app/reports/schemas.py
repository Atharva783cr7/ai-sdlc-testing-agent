from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExportFormat(str, Enum):
    JSON = "json"
    HTML = "html"
    CSV = "csv"


class PhaseStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    PARTIAL = "partial"
    SKIPPED = "skipped"


class PhaseSummary(BaseModel):
    phase_number: int = Field(..., description="Phase number (1-8)")
    phase_name: str = Field(..., description="Human-readable phase name")
    status: PhaseStatus = Field(..., description="Overall phase status")
    summary: str = Field(..., description="Brief summary of phase results")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Key metrics for this phase")


class TestExecutionReportSection(BaseModel):
    total_tests: int = Field(0, description="Total number of tests executed")
    passed: int = Field(0, description="Number of passed tests")
    failed: int = Field(0, description="Number of failed tests")
    errors: int = Field(0, description="Number of error tests")
    skipped: int = Field(0, description="Number of skipped tests")
    pass_rate: float = Field(0.0, description="Pass rate percentage")
    duration: Optional[float] = Field(None, description="Total execution duration in seconds")
    failed_test_ids: List[str] = Field(default_factory=list, description="IDs of failed tests")
    error_test_ids: List[str] = Field(default_factory=list, description="IDs of error tests")


class AnalysisReportSection(BaseModel):
    total_failures: int = Field(0, description="Total failures analyzed")
    failure_types: Dict[str, int] = Field(default_factory=dict, description="Count by failure type")
    root_causes: List[Dict[str, Any]] = Field(default_factory=list, description="Root cause summaries")
    product_defects: int = Field(0, description="Number of product defects identified")
    test_defects: int = Field(0, description="Number of test defects identified")
    flaky_tests: int = Field(0, description="Number of flaky tests detected")


class QualityGateReportSection(BaseModel):
    overall_status: str = Field("NOT_EVALUATED", description="Overall gate status")
    release_readiness: str = Field("NOT_READY", description="Release readiness")
    quality_score: float = Field(0.0, description="Quality score (0-100)")
    gate_results: List[Dict[str, Any]] = Field(default_factory=list, description="Individual gate results")
    blocking_gates: List[str] = Field(default_factory=list, description="Names of failed gates")


class TraceabilityReportSection(BaseModel):
    total_entries: int = Field(0, description="Total traceability entries")
    coverage_percentage: float = Field(0.0, description="Requirements coverage percentage")
    uncovered_requirements: List[str] = Field(default_factory=list, description="Uncovered requirement IDs")
    orphaned_test_cases: List[str] = Field(default_factory=list, description="Test cases without traceability")
    orphaned_test_data: List[str] = Field(default_factory=list, description="Test data not linked to cases")


class TestReport(BaseModel):
    report_id: str = Field(..., description="Unique report ID")
    project_id: str = Field(..., description="Project identifier")
    generated_at: str = Field(..., description="ISO 8601 timestamp")
    phases: List[PhaseSummary] = Field(default_factory=list, description="Phase-by-phase summaries")
    execution: TestExecutionReportSection = Field(default_factory=TestExecutionReportSection)
    analysis: AnalysisReportSection = Field(default_factory=AnalysisReportSection)
    quality_gate: QualityGateReportSection = Field(default_factory=QualityGateReportSection)
    traceability: TraceabilityReportSection = Field(default_factory=TraceabilityReportSection)
    executive_summary: str = Field("", description="High-level executive summary")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
    raw_data: Dict[str, Any] = Field(default_factory=dict, description="Full raw data from all phases")
