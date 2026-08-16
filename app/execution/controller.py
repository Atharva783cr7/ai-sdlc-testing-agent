"""Execution controller for Phase 4.

Provides a single `ExecutionController` class that dispatches test case
specifications to simple execution modules. Execution modules are deterministic
simulators that return one of: PASS, FAIL, ERROR, SKIPPED.
"""
from typing import Dict, Any, List
import logging
import time
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
import uuid
import datetime
import platform as _platform
import sys as _sys

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
        # Phase 5 defaults
        self.max_workers = 8
        self.default_retry = 0
        self.run_id = None
        # runtime metadata (populated per execute_test_suite run)
        self.run_started_at = None
        self.run_completed_at = None
        self.run_duration = None
        self.platform = f"{_platform.system()} { _platform.release()}"
        self.python_version = _sys.version

    def execute_test_case(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single test case specification.

        Returns an enriched result dict including Phase 5 metadata:
        duration, attempts, logs, artifacts, screenshot.
        """
        tcid = test_case.get("test_case_id") or test_case.get("id") or "unknown"
        name = test_case.get("title")
        ttype = (test_case.get("test_type") or "unit").lower()

        module = self._modules.get(ttype)
        if module is None:
            logger.info(f"No execution module for type '{ttype}', marking SKIPPED")
            return {
            "test_case_id": tcid,
            "run_id": self.run_id,
                "name": name,
                "status": "SKIPPED",
                "details": f"No execution module for type '{ttype}'",
                "module": None,
                "duration": 0.0,
                "attempts": 0,
                "logs": [],
                "artifacts": [],
                "screenshot": None,
            }

        # Determine retries: per-test override then controller default
        max_retries = int(test_case.get("retry", self.default_retry) or 0)

        attempts = 0
        logs: List[Dict[str, Any]] = []
        artifacts: List[Dict[str, Any]] = []
        artifacts_meta: List[Dict[str, Any]] = []
        attempts_detail: List[Dict[str, Any]] = []
        screenshot = None
        start_total = time.time()

        while True:
            attempts += 1
            start = time.time()
            try:
                result = module.run(test_case)
                status = result.get("status")
                details = result.get("details")
            except Exception as e:
                logger.exception("Execution module raised an exception")
                status = "ERROR"
                details = str(e)

            end = time.time()
            duration = end - start
            attempt_entry = {
                "attempt_number": attempts,
                "start": datetime.datetime.utcfromtimestamp(start).isoformat() + 'Z',
                "end": datetime.datetime.utcfromtimestamp(end).isoformat() + 'Z',
                "duration": duration,
                "status": status,
                "details": details,
                "timestamp": datetime.datetime.utcfromtimestamp(end).isoformat() + 'Z',
            }
            logs.append(attempt_entry)
            attempts_detail.append(attempt_entry)

            # If UI error, attempt to capture a screenshot artifact (best-effort)
            if ttype == 'ui' and status == 'ERROR':
                try:
                    # Best-effort headless screenshot using selenium if available
                    try:
                        # Only require webdriver to be importable; some test mocks
                        # provide `selenium.webdriver` without `selenium.common`.
                        from selenium import webdriver
                        selenium_available = True
                    except Exception:
                        selenium_available = False

                    if selenium_available:
                        options = webdriver.ChromeOptions()
                        options.add_argument('--headless=new')
                        driver = webdriver.Chrome(options=options)
                        try:
                            # Try to open the first ui action URL if available
                            actions = test_case.get('ui_actions') or []
                            first_open = next((a.get('url') for a in actions if a.get('action') == 'open'), None)
                            if first_open:
                                driver.get(first_open)
                            fd, path = tempfile.mkstemp(suffix='.png')
                            driver.save_screenshot(path)
                            art = {"type": "screenshot", "path": path}
                            artifacts.append(art)
                            artifacts_meta.append({
                                "type": "screenshot",
                                "path": path,
                                "metadata": {},
                                "test_case_id": tcid,
                                "attempt": attempts,
                            })
                            screenshot = path
                        finally:
                            try:
                                driver.quit()
                            except Exception:
                                pass
                except Exception:
                    # Do not let screenshot attempts break execution reporting
                    logger.exception('Screenshot capture failed')

            # Decide whether to stop retrying
            if status == 'PASS' or status == 'SKIPPED' or attempts > max_retries:
                break

            # Otherwise status is FAIL/ERROR and we may retry
            if attempts <= max_retries:
                logger.info(f"Retrying {tcid}: attempt {attempts} of {max_retries}")
                continue
            else:
                break

        total_duration = time.time() - start_total

        return {
            "test_case_id": tcid,
            "run_id": self.run_id,  # run_id attached to every result
            "name": name,
            "status": status,
            "details": details,
            "module": ttype,
            "duration": total_duration,
            "attempts": attempts,
            "logs": logs,
            "attempts_detail": attempts_detail,
            "artifacts": artifacts,
            "artifacts_meta": artifacts_meta,
            "screenshot": screenshot,
            "screenshot_meta": ({"path": screenshot, "captured_at": datetime.datetime.utcnow().isoformat() + 'Z'} if screenshot else None),
        }

    def execute_test_suite(self, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a list of test cases and return aggregated results.

        Returns a dict with `results` (list) and `summary`.
        """
        results: List[Dict[str, Any]] = []
        counts = {"PASS": 0, "FAIL": 0, "ERROR": 0, "SKIPPED": 0}

        # generate run-level metadata
        self.run_id = str(uuid.uuid4()).upper()
        self.run_started_at = datetime.datetime.utcnow().isoformat() + 'Z'
        self.run_completed_at = None
        self.run_duration = None

        # Execute in parallel using threads (I/O bound modules like httpx/selenium)
        max_workers = min(self.max_workers, max(1, len(test_cases)))
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futures = {ex.submit(self.execute_test_case, tc): tc for tc in test_cases}
            for fut in as_completed(futures):
                try:
                    res = fut.result()
                except Exception as e:
                    # Shouldn't happen as execute_test_case handles exceptions, but capture defensively
                    logger.exception('Unexpected error in future')
                    res = {"test_case_id": "unknown", "status": "ERROR", "details": str(e), "module": None}
                results.append(res)
                counts[res.get("status")] = counts.get(res.get("status"), 0) + 1

        # finalize run metadata
        self.run_completed_at = datetime.datetime.utcnow().isoformat() + 'Z'
        try:
            self.run_duration = (datetime.datetime.fromisoformat(self.run_completed_at.replace('Z','')) - datetime.datetime.fromisoformat(self.run_started_at.replace('Z',''))).total_seconds()
        except Exception:
            self.run_duration = None

        summary = {
            "total": len(results),
            "pass": counts.get("PASS", 0),
            "fail": counts.get("FAIL", 0),
            "error": counts.get("ERROR", 0),
            "skipped": counts.get("SKIPPED", 0),
        }

        return {
            "run_id": self.run_id,
            "started_at": self.run_started_at,
            "completed_at": self.run_completed_at,
            "duration": self.run_duration,
            "platform": self.platform,
            "python_version": self.python_version,
            "max_retries": self.default_retry,
            "max_workers": max_workers,
            "results": results,
            "summary": summary,
        }
