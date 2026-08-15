import os
import logging
from typing import Type, TypeVar, Optional, List
from pydantic import BaseModel, Field

# Import schemas to compile responses and mock structures
from app.models.state import (
    RequirementInfo,
    RiskInfo,
    ChangeImpactInfo,
    CoverageInfo,
    TestStrategyInfo
)

logger = logging.getLogger(__name__)

# generic model type parameter for schema validation
T = TypeVar("T", bound=BaseModel)

# Define wrappers for list responses required by structured output generation APIs
class RequirementsWrapper(BaseModel):
    requirements: List[RequirementInfo] = Field(..., description="List of extracted testable requirements")

class RisksWrapper(BaseModel):
    risks: List[RiskInfo] = Field(..., description="List of identified software and design risks")

class GeminiService:
    """
    Service layer providing unified access to Gemini LLM with Pydantic validation
    and deterministic mock fallbacks depending on execution mode.
    """
    def __init__(self):
        # LLM_MODE can be 'mock' or 'gemini'
        self.llm_mode = os.getenv("LLM_MODE", "mock").lower()
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None

        logger.info(f"Initializing GeminiService in '{self.llm_mode}' mode.")

        if self.llm_mode == "gemini":
            if not self.api_key:
                raise ValueError(
                    "GEMINI_API_KEY environment variable is missing, "
                    "but LLM_MODE is configured as 'gemini'. Real execution requires an API key."
                )
            
            # Late import of google-genai to avoid import issues in non-genai configurations
            from google import genai
            self.client = genai.Client(api_key=self.api_key)

    def generate_structured_output(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: Optional[str] = None
    ) -> T:
        """
        Requests structured output from Gemini using Pydantic schema validation.
        In mock mode, returns pre-defined high-fidelity mock models.
        """
        if self.llm_mode == "mock":
            return self._generate_mock_output(response_schema)

        if not self.client:
            raise RuntimeError("Gemini SDK client was not initialized properly.")

        try:
            from google.genai import types
            
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                system_instruction=system_instruction,
                temperature=0.1,  # Lower temperature for deterministic reasoning/extraction
            )

            logger.info(f"Requesting Gemini API structured content for {response_schema.__name__}")
            
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )

            if not response.text:
                raise ValueError("Gemini returned an empty/null response text.")

            # Validate response string against Pydantic schema
            validated_object = response_schema.model_validate_json(response.text)
            return validated_object

        except Exception as e:
            logger.error(f"Gemini Structured generation failed: {str(e)}", exc_info=True)
            raise RuntimeError(f"Failed to generate structured AI analysis: {str(e)}")

    def _generate_mock_output(self, response_schema: Type[T]) -> T:
        """
        Creates rich, deterministic mock data matching target schemas for offline testing.
        """
        schema_name = response_schema.__name__
        logger.info(f"Generating offline mock for Pydantic schema: {schema_name}")

        if response_schema is RequirementsWrapper:
            data = {
                "requirements": [
                    {
                        "id": "REQ-001",
                        "description": "The system must process real-time room temperature and telemetry readings.",
                        "category": "Functional",
                        "source": "srs"
                    },
                    {
                        "id": "REQ-002",
                        "description": "Trigger automated alerts when device readings exceed configurable thresholds.",
                        "category": "Functional",
                        "source": "srs"
                    },
                    {
                        "id": "REQ-003",
                        "description": "State telemetry collector must be isolated as an independent microservice.",
                        "category": "Functional",
                        "source": "sdd"
                    }
                ]
            }
            return response_schema.model_validate(data)

        elif response_schema is RisksWrapper:
            data = {
                "risks": [
                    {
                        "risk_id": "RSK-001",
                        "requirement_id": "REQ-001",
                        "description": "High frequency data bursts from sensor devices may overflow DB buffer size.",
                        "severity": "Medium",
                        "likelihood": "Low",
                        "mitigation": "Write high-load mock telemetries to verify buffer queue overflows.",
                        "source": "ai_inference"
                    },
                    {
                        "risk_id": "RSK-002",
                        "requirement_id": "REQ-002",
                        "description": "HVAC threshold alerts delayed due to async notification processing bottlenecks.",
                        "severity": "High",
                        "likelihood": "Medium",
                        "mitigation": "Simulate network delay and measure alert generation latency SLA.",
                        "source": "ai_inference"
                    }
                ]
            }
            return response_schema.model_validate(data)

        elif response_schema is ChangeImpactInfo:
            data = {
                "has_changes": True,
                "changed_files": ["app/services/telemetry.py"],
                "changed_functions": ["parse_sensor_reading"],
                "impacted_requirements": ["REQ-001"],
                "regression_risk": "Medium",
                "message": "Modification inside parse_sensor_reading impacts telemetry ingestion (REQ-001). Code updates could fail ingestion logic.",
                "source": "source_code"
            }
            return response_schema.model_validate(data)

        elif response_schema is CoverageInfo:
            data = {
                "mapped_requirements": ["REQ-001", "REQ-002"],
                "uncovered_requirements": ["REQ-003"],
                "coverage_percentage": 66.7,
                "source": "ai_inference"
            }
            return response_schema.model_validate(data)

        elif response_schema is TestStrategyInfo:
            data = {
                "unit_tests": [
                    "Verify parse_sensor_reading parser rejects invalid hex keys.",
                    "Verify AlertTrigger evaluates boundary thresholds."
                ],
                "integration_tests": [
                    "Ensure telemetry collector routes alerts to notifier dispatch queue."
                ],
                "api_tests": [
                    "Check POST /telemetry accepts Pydantic requests.",
                    "Test GET /alerts filter options."
                ],
                "tools": ["pytest", "httpx"],
                "environments": ["staging"],
                "source": "ai_inference"
            }
            return response_schema.model_validate(data)

        else:
            raise ValueError(f"No mock generator defined for schema: {schema_name}")

# Shared singleton instance used across all intelligence nodes
gemini_service = GeminiService()

