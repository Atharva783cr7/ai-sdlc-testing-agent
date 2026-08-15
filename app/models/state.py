from typing import TypedDict, List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

SourceType = Literal["srs", "sdd", "source_code", "ai_inference"]

class RequirementInfo(BaseModel):
    id: str = Field(..., description="Unique requirement ID (e.g. REQ-001)")
    description: str = Field(..., description="Details of the requirement")
    category: str = Field(..., description="Functional, Non-Functional, Security, etc.")
    source: SourceType = Field(..., description="The backing source of this requirement")

class RiskInfo(BaseModel):
    risk_id: str = Field(..., description="Unique risk ID (e.g. RSK-001)")
    requirement_id: Optional[str] = Field(None, description="Mapped requirement ID if applicable")
    description: str = Field(..., description="Details of the potential failure")
    severity: Literal["High", "Medium", "Low"] = Field(..., description="Severity of the risk")
    likelihood: Literal["High", "Medium", "Low"] = Field(..., description="Likelihood of occurrence")
    mitigation: str = Field(..., description="Proposed test-level mitigation")
    source: SourceType = Field(..., description="Backing source or ai_inference")

class ChangeImpactInfo(BaseModel):
    has_changes: bool = Field(..., description="Whether real changes are detected")
    changed_files: List[str] = Field(default_factory=list, description="List of files that were changed")
    changed_functions: List[str] = Field(default_factory=list, description="List of functions that were changed")
    impacted_requirements: List[str] = Field(default_factory=list, description="IDs of requirements affected by these changes")
    regression_risk: Literal["High", "Medium", "Low", "None"] = Field(..., description="Regression risk level")
    message: str = Field(..., description="Explanation of impact or 'change information unavailable'")
    source: SourceType = Field(..., description="Backing source of impact information")

class CoverageInfo(BaseModel):
    mapped_requirements: List[str] = Field(default_factory=list, description="IDs of covered requirements")
    uncovered_requirements: List[str] = Field(default_factory=list, description="IDs of uncovered requirements")
    coverage_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of requirements mapped to code/endpoints")
    source: SourceType = Field(..., description="Source of coverage mapping")

class TestStrategyInfo(BaseModel):
    __test__ = False  # Prevent Pytest from trying to collect this as a test class
    unit_tests: List[str] = Field(..., description="Suggested unit test targets and mocks")
    integration_tests: List[str] = Field(..., description="Suggested integration test targets")
    api_tests: List[str] = Field(..., description="Suggested API/Contract verification steps")
    tools: List[str] = Field(..., description="Recommended tools e.g. pytest, httpx")
    environments: List[str] = Field(..., description="Target environment configs")
    source: SourceType = Field(..., description="Source of the strategy compilation")


class TestingState(TypedDict):
    __test__ = False  # Prevent Pytest from trying to collect this as a test class

    # Required inputs
    project_id: str
    srs: Dict[str, Any]
    sdd: Dict[str, Any]
    source_code: Dict[str, Any]

    # Optional inputs
    api_docs: Optional[Dict[str, Any]]
    database_schema: Optional[Dict[str, Any]]
    test_data: Optional[Dict[str, Any]]
    environment: Optional[Dict[str, Any]]

    # Workflow output and tracking fields
    validation_status: str       # "passed", "failed", or "pending"
    validation_errors: List[str]
    context: Dict[str, Any]      # Structured testing context loaded from the inputs
    workflow_status: str         # "pending", "running", "completed", or "failed"
    human_feedback: Optional[str]

    # Phase 2 output fields
    requirements: List[RequirementInfo]
    risks: List[RiskInfo]
    change_impact: Optional[ChangeImpactInfo]
    coverage: Optional[CoverageInfo]
    test_strategy: Optional[TestStrategyInfo]
