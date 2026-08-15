"""Execution controller for Phase 4.

Provides a single `ExecutionController` class that dispatches test case
specifications to simple execution modules. Execution modules are deterministic
simulators that return one of: PASS, FAIL, ERROR, SKIPPED.
"""
from typing import Dict, Any, List
import logging

from app.execution.modules import (
    unit as unit_module,
    api as api_module,
    ui as ui_module,
    integration as integration_module,
    security as security_module,
    regression as regression_module,
)

logger = logging.getLogger(__name__)


class ExecutionController:
    """Single testing agent / execution controller.

    Use `execute_test_case` to execute a single test case specification and
    `execute_test_suite` for a list of test cases.
    """

    MODULE_MAP = {
        "unit": unit_module,
        "api": api_module,
        "ui": ui_module,
        "integration": integration_module,
        "security": security_module,
        "regression": regression_module,
    }

    def __init__(self):
        self._modules = self.MODULE_MAP

    def execute_test_case(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single test case specification.

        Returns a result dict with keys: `test_case_id`, `status`, `details`,
        `module`.
        """
        tcid = test_case.get("test_case_id") or test_case.get("id") or "unknown"
        ttype = (test_case.get("test_type") or "unit").lower()

        module = self._modules.get(ttype)
        if module is None:
            logger.info(f"No execution module for type '{ttype}', marking SKIPPED")
            return {
                "test_case_id": tcid,
                "status": "SKIPPED",
                "details": f"No execution module for type '{ttype}'",
                "module": None,
            }

        try:
            result = module.run(test_case)
            # Normalize result
            status = result.get("status")
            details = result.get("details")
            return {
                "test_case_id": tcid,
                "status": status,
                "details": details,
                "module": ttype,
            }
        except Exception as e:
            logger.exception("Execution module raised an exception")
            return {
                "test_case_id": tcid,
                "status": "ERROR",
                "details": str(e),
                "module": ttype,
            }

    def execute_test_suite(self, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a list of test cases and return aggregated results.

        Returns a dict with `results` (list) and `summary`.
        """
        results = []
        counts = {"PASS": 0, "FAIL": 0, "ERROR": 0, "SKIPPED": 0}

        for tc in test_cases:
            res = self.execute_test_case(tc)
            results.append(res)
            counts[res.get("status")] = counts.get(res.get("status"), 0) + 1

        summary = {
            "total": len(results),
            "pass": counts.get("PASS", 0),
            "fail": counts.get("FAIL", 0),
            "error": counts.get("ERROR", 0),
            "skipped": counts.get("SKIPPED", 0),
        }

        return {"results": results, "summary": summary}
