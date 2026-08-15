from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from app.models.state import (
    RequirementInfo,
    RiskInfo,
    ChangeImpactInfo,
    CoverageInfo,
    TestStrategyInfo
)

class TestingStartRequest(BaseModel):
    """
    Request model for starting the Testing Agent flow.
    """
    project_id: str = Field(..., description="Unique identifier for the project")
    srs: Dict[str, Any] = Field(..., description="Software Requirement Specification document/metadata")
    sdd: Dict[str, Any] = Field(..., description="Software Design Document/metadata")
    source_code: Dict[str, Any] = Field(..., description="Developed source code info/metadata")
    
    # Optional inputs
    api_docs: Optional[Dict[str, Any]] = Field(default=None, description="API documentation metadata")
    database_schema: Optional[Dict[str, Any]] = Field(default=None, description="Database schema metadata")
    test_data: Optional[Dict[str, Any]] = Field(default=None, description="Test data/fixtures metadata")
    environment: Optional[Dict[str, Any]] = Field(default=None, description="Target environment metadata")

    model_config = {
        "json_schema_extra": {
            "example": {
                "project_id": "smart-building-001",
                "srs": {"title": "Smart Building SRS", "version": "1.0"},
                "sdd": {"architecture": "Microservices", "components": []},
                "source_code": {"repository": "github.com/org/repo", "language": "Python"},
                "api_docs": {"base_url": "https://api.building.com"},
                "database_schema": {"tables": ["rooms", "sensors"]},
                "test_data": {"users": []},
                "environment": {"name": "staging"}
            }
        }
    }

class IntelligenceSummary(BaseModel):
    """
    Summary of the AI analysis generated during the workflow execution.
    """
    requirements: List[RequirementInfo] = Field(default_factory=list, description="Extracted testable requirement specifications")
    risks: List[RiskInfo] = Field(default_factory=list, description="Software risks mapped to requirements")
    change_impact: Optional[ChangeImpactInfo] = Field(default=None, description="Change impact analysis regression report")
    coverage: Optional[CoverageInfo] = Field(default=None, description="Requirements mapping coverage details")
    test_strategy: Optional[TestStrategyInfo] = Field(default=None, description="Recommended test execution blueprint")

class TestingStartResponse(BaseModel):
    """
    Response model returning the results of the Testing Agent Phase 2 execution.
    """
    project_id: str
    validation_status: str
    validation_errors: List[str]
    workflow_status: str
    intelligence: Optional[IntelligenceSummary] = Field(default=None, description="Encapsulated quality and testing intelligence report")
