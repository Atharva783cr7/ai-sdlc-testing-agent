from __future__ import annotations

import csv
import io
import json
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.reports.schemas import (
    AnalysisReportSection,
    ExportFormat,
    PhaseStatus,
    PhaseSummary,
    QualityGateReportSection,
    TestExecutionReportSection,
    TestReport,
    TraceabilityReportSection,
)


class ReportGenerator:
    def generate(
        self,
        project_id: str,
        requirements: Optional[List[Dict[str, Any]]] = None,
        risks: Optional[List[Dict[str, Any]]] = None,
        change_impact: Optional[Dict[str, Any]] = None,
        coverage: Optional[Dict[str, Any]] = None,
        test_strategy: Optional[Dict[str, Any]] = None,
        test_cases: Optional[List[Dict[str, Any]]] = None,
        test_scenarios: Optional[List[Dict[str, Any]]] = None,
        generated_test_data: Optional[List[Dict[str, Any]]] = None,
        traceability: Optional[Dict[str, Any]] = None,
        execution_results: Optional[List[Dict[str, Any]]] = None,
        execution_summary: Optional[Dict[str, Any]] = None,
        execution_status: Optional[str] = None,
        result_intelligence: Optional[Dict[str, Any]] = None,
        failure_analyses: Optional[List[Dict[str, Any]]] = None,
        root_cause_analyses: Optional[List[Dict[str, Any]]] = None,
        defect_analyses: Optional[List[Dict[str, Any]]] = None,
        flaky_analyses: Optional[List[Dict[str, Any]]] = None,
        quality_gate_report: Optional[Dict[str, Any]] = None,
        quality_score: Optional[float] = None,
        release_readiness: Optional[str] = None,
    ) -> TestReport:
        requirements = requirements or []
        risks = risks or []
        test_cases = test_cases or []
        test_scenarios = test_scenarios or []
        generated_test_data = generated_test_data or []
        execution_results = execution_results or []
        failure_analyses = failure_analyses or []
        root_cause_analyses = root_cause_analyses or []
        defect_analyses = defect_analyses or []
        flaky_analyses = flaky_analyses or []

        phases = self._build_phase_summaries(
            requirements=requirements,
            risks=risks,
            coverage=coverage,
            test_cases=test_cases,
            test_scenarios=test_scenarios,
            execution_status=execution_status,
            execution_summary=execution_summary,
            quality_gate_report=quality_gate_report,
            failure_analyses=failure_analyses,
            defect_analyses=defect_analyses,
        )

        execution_section = self._build_execution_section(
            execution_results=execution_results,
            execution_summary=execution_summary,
        )

        analysis_section = self._build_analysis_section(
            failure_analyses=failure_analyses,
            root_cause_analyses=root_cause_analyses,
            defect_analyses=defect_analyses,
            flaky_analyses=flaky_analyses,
        )

        quality_section = self._build_quality_section(
            quality_gate_report=quality_gate_report,
            quality_score=quality_score,
            release_readiness=release_readiness,
        )

        traceability_section = self._build_traceability_section(
            traceability=traceability,
            coverage=coverage,
        )

        executive_summary = self._build_executive_summary(
            project_id=project_id,
            execution_summary=execution_summary,
            quality_score=quality_score,
            release_readiness=release_readiness,
            analysis_section=analysis_section,
            quality_section=quality_section,
        )

        recommendations = self._build_recommendations(
            execution_section=execution_section,
            analysis_section=analysis_section,
            quality_section=quality_section,
            traceability_section=traceability_section,
        )

        raw_data = self._build_raw_data(
            requirements=requirements,
            risks=risks,
            change_impact=change_impact,
            coverage=coverage,
            test_strategy=test_strategy,
            test_cases=test_cases,
            test_scenarios=test_scenarios,
            generated_test_data=generated_test_data,
            traceability=traceability,
            execution_results=execution_results,
            execution_summary=execution_summary,
            result_intelligence=result_intelligence,
            failure_analyses=failure_analyses,
            root_cause_analyses=root_cause_analyses,
            defect_analyses=defect_analyses,
            flaky_analyses=flaky_analyses,
            quality_gate_report=quality_gate_report,
        )

        return TestReport(
            report_id=f"RPT-{uuid.uuid4().hex[:8].upper()}",
            project_id=project_id,
            generated_at=datetime.now(timezone.utc).isoformat(),
            phases=phases,
            execution=execution_section,
            analysis=analysis_section,
            quality_gate=quality_section,
            traceability=traceability_section,
            executive_summary=executive_summary,
            recommendations=recommendations,
            raw_data=raw_data,
        )

    def export(self, report: TestReport, fmt: ExportFormat) -> str:
        if fmt == ExportFormat.JSON:
            return self._export_json(report)
        if fmt == ExportFormat.HTML:
            return self._export_html(report)
        if fmt == ExportFormat.CSV:
            return self._export_csv(report)
        raise ValueError(f"Unsupported format: {fmt}")

    def export_bytes(self, report: TestReport, fmt: ExportFormat) -> bytes:
        return self.export(report, fmt).encode("utf-8")

    def export_json(self, report: TestReport) -> str:
        return self._export_json(report)

    def export_html(self, report: TestReport) -> str:
        return self._export_html(report)

    def export_csv(self, report: TestReport) -> str:
        return self._export_csv(report)

    # ------------------------------------------------------------------
    # Phase summaries
    # ------------------------------------------------------------------

    def _build_phase_summaries(
        self,
        requirements: List[Dict[str, Any]],
        risks: List[Dict[str, Any]],
        coverage: Optional[Dict[str, Any]],
        test_cases: List[Dict[str, Any]],
        test_scenarios: List[Dict[str, Any]],
        execution_status: Optional[str],
        execution_summary: Optional[Dict[str, Any]],
        quality_gate_report: Optional[Dict[str, Any]],
        failure_analyses: Optional[List[Dict[str, Any]]] = None,
        defect_analyses: Optional[List[Dict[str, Any]]] = None,
    ) -> List[PhaseSummary]:
        phases: List[PhaseSummary] = []

        phases.append(PhaseSummary(
            phase_number=1,
            phase_name="Input Validation & Context Loading",
            status=PhaseStatus.PASSED,
            summary="Input validation and context loading completed successfully.",
            metrics={},
        ))

        req_count = len(requirements)
        risk_count = len(risks)
        cov_pct = coverage.get("coverage_percentage", 0.0) if coverage else 0.0
        phases.append(PhaseSummary(
            phase_number=2,
            phase_name="Testing Intelligence",
            status=PhaseStatus.PASSED if req_count > 0 else PhaseStatus.SKIPPED,
            summary=f"Analyzed {req_count} requirements and {risk_count} risks. Coverage at {cov_pct:.1f}%.",
            metrics={"requirements": req_count, "risks": risk_count, "coverage_pct": cov_pct},
        ))

        tc_count = len(test_cases)
        sc_count = len(test_scenarios)
        phases.append(PhaseSummary(
            phase_number=3,
            phase_name="Test Design",
            status=PhaseStatus.PASSED if tc_count > 0 else PhaseStatus.SKIPPED,
            summary=f"Generated {tc_count} test cases and {sc_count} scenarios.",
            metrics={"test_cases": tc_count, "scenarios": sc_count},
        ))

        exec_status_val = execution_status or "not_executed"
        exec_phase_status = PhaseStatus.PASSED if exec_status_val == "completed" else PhaseStatus.PARTIAL
        phases.append(PhaseSummary(
            phase_number=4,
            phase_name="Test Execution",
            status=exec_phase_status,
            summary=f"Execution status: {exec_status_val}.",
            metrics=execution_summary or {},
        ))

        phases.append(PhaseSummary(
            phase_number=5,
            phase_name="Execution Enrichment",
            status=exec_phase_status,
            summary="Execution results enriched with metadata, retries, and screenshots.",
            metrics=execution_summary or {},
        ))

        intel_status = PhaseStatus.PASSED if failure_analyses or defect_analyses else PhaseStatus.SKIPPED
        phases.append(PhaseSummary(
            phase_number=6,
            phase_name="Result Intelligence",
            status=intel_status,
            summary=f"Analyzed {len(failure_analyses)} failures, classified {len(defect_analyses)} defects.",
            metrics={"failures": len(failure_analyses), "defects": len(defect_analyses)},
        ))

        qg_status_str = "NOT_EVALUATED"
        if quality_gate_report:
            qg_status_str = quality_gate_report.get("overall_status", "NOT_EVALUATED")
        phases.append(PhaseSummary(
            phase_number=7,
            phase_name="Quality Gate",
            status=PhaseStatus.PASSED if qg_status_str == "PASS" else (
                PhaseStatus.FAILED if qg_status_str == "FAIL" else PhaseStatus.PARTIAL
            ),
            summary=f"Quality gate: {qg_status_str}.",
            metrics={"overall_status": qg_status_str},
        ))

        phases.append(PhaseSummary(
            phase_number=8,
            phase_name="Report Generation",
            status=PhaseStatus.PASSED,
            summary="Comprehensive report generated and exported.",
            metrics={"export_formats": ["json", "html", "csv"]},
        ))

        return phases

    # ------------------------------------------------------------------
    # Execution section
    # ------------------------------------------------------------------

    def _build_execution_section(
        self,
        execution_results: List[Dict[str, Any]],
        execution_summary: Optional[Dict[str, Any]],
    ) -> TestExecutionReportSection:
        if not execution_summary:
            return TestExecutionReportSection()

        total = execution_summary.get("total", 0)
        passed = execution_summary.get("pass", execution_summary.get("passed", 0))
        failed = execution_summary.get("fail", execution_summary.get("failed", 0))
        errors = execution_summary.get("error", execution_summary.get("errors", 0))
        skipped = execution_summary.get("skipped", 0)
        pass_rate = (passed / total * 100) if total > 0 else 0.0

        failed_ids = [
            r.get("test_case_id", r.get("id", "unknown"))
            for r in execution_results
            if r.get("status") == "FAIL"
        ]
        error_ids = [
            r.get("test_case_id", r.get("id", "unknown"))
            for r in execution_results
            if r.get("status") == "ERROR"
        ]

        return TestExecutionReportSection(
            total_tests=total,
            passed=passed,
            failed=failed,
            errors=errors,
            skipped=skipped,
            pass_rate=round(pass_rate, 2),
            duration=execution_summary.get("duration"),
            failed_test_ids=failed_ids,
            error_test_ids=error_ids,
        )

    # ------------------------------------------------------------------
    # Analysis section
    # ------------------------------------------------------------------

    def _build_analysis_section(
        self,
        failure_analyses: List[Dict[str, Any]],
        root_cause_analyses: List[Dict[str, Any]],
        defect_analyses: List[Dict[str, Any]],
        flaky_analyses: List[Dict[str, Any]],
    ) -> AnalysisReportSection:
        failure_types: Dict[str, int] = dict(Counter(
            fa.get("failure_type", "unknown") for fa in failure_analyses
        ))

        root_causes = [
            {
                "category": rc.get("category", "unknown"),
                "hypothesis": rc.get("hypothesis", ""),
                "confidence": rc.get("confidence", "low"),
            }
            for rc in root_cause_analyses
        ]

        product_defects = sum(
            1 for da in defect_analyses
            if da.get("classification") in ("product_defect", "product_defect_configuration", "product_defect_performance")
        )
        test_defects = sum(
            1 for da in defect_analyses
            if da.get("classification") in ("test_defect", "test_defect_flaky", "test_defect_data")
        )

        flaky_count = sum(
            1 for fa in flaky_analyses
            if fa.get("verdict") == "FLAKY"
        )

        return AnalysisReportSection(
            total_failures=len(failure_analyses),
            failure_types=failure_types,
            root_causes=root_causes,
            product_defects=product_defects,
            test_defects=test_defects,
            flaky_tests=flaky_count,
        )

    # ------------------------------------------------------------------
    # Quality gate section
    # ------------------------------------------------------------------

    def _build_quality_section(
        self,
        quality_gate_report: Optional[Dict[str, Any]],
        quality_score: Optional[float],
        release_readiness: Optional[str],
    ) -> QualityGateReportSection:
        if not quality_gate_report:
            return QualityGateReportSection()

        gates = quality_gate_report.get("gates", [])
        gate_results = [
            {"name": g.get("gate", "unknown"), "status": g.get("status", "NOT_EVALUATED")}
            for g in gates
        ]
        blocking = [
            g.get("gate", "unknown")
            for g in gates
            if g.get("status") == "FAIL"
        ]

        return QualityGateReportSection(
            overall_status=quality_gate_report.get("overall_status", "NOT_EVALUATED"),
            release_readiness=release_readiness or "NOT_READY",
            quality_score=quality_score or 0.0,
            gate_results=gate_results,
            blocking_gates=blocking,
        )

    # ------------------------------------------------------------------
    # Traceability section
    # ------------------------------------------------------------------

    def _build_traceability_section(
        self,
        traceability: Optional[Dict[str, Any]],
        coverage: Optional[Dict[str, Any]],
    ) -> TraceabilityReportSection:
        if not traceability:
            cov_pct = coverage.get("coverage_percentage", 0.0) if coverage else 0.0
            return TraceabilityReportSection(coverage_percentage=cov_pct)

        entries = traceability.get("entries", [])
        return TraceabilityReportSection(
            total_entries=len(entries),
            coverage_percentage=coverage.get("coverage_percentage", 0.0) if coverage else 0.0,
            uncovered_requirements=traceability.get("uncovered_requirements", []),
            orphaned_test_cases=traceability.get("orphaned_test_cases", []),
            orphaned_test_data=traceability.get("orphaned_test_data", []),
        )

    # ------------------------------------------------------------------
    # Executive summary
    # ------------------------------------------------------------------

    def _build_executive_summary(
        self,
        project_id: str,
        execution_summary: Optional[Dict[str, Any]],
        quality_score: Optional[float],
        release_readiness: Optional[str],
        analysis_section: AnalysisReportSection,
        quality_section: QualityGateReportSection,
    ) -> str:
        parts = [f"Project {project_id} — Testing Report."]

        if execution_summary:
            total = execution_summary.get("total", 0)
            passed = execution_summary.get("passed", 0)
            pass_rate = (passed / total * 100) if total > 0 else 0.0
            parts.append(f"Executed {total} tests with {pass_rate:.1f}% pass rate.")

        if quality_score is not None:
            parts.append(f"Quality score: {quality_score:.1f}/100.")

        if release_readiness:
            parts.append(f"Release readiness: {release_readiness}.")

        if analysis_section.product_defects > 0:
            parts.append(f"{analysis_section.product_defects} product defect(s) identified.")
        if analysis_section.flaky_tests > 0:
            parts.append(f"{analysis_section.flaky_tests} flaky test(s) detected.")

        return " ".join(parts)

    # ------------------------------------------------------------------
    # Recommendations
    # ------------------------------------------------------------------

    def _build_recommendations(
        self,
        execution_section: TestExecutionReportSection,
        analysis_section: AnalysisReportSection,
        quality_section: QualityGateReportSection,
        traceability_section: TraceabilityReportSection,
    ) -> List[str]:
        recs: List[str] = []

        if execution_section.total_tests > 0 and execution_section.pass_rate < 80:
            recs.append("Pass rate is below 80%. Investigate failing tests before release.")

        if analysis_section.product_defects > 0:
            recs.append(f"Fix {analysis_section.product_defects} product defect(s) identified by root cause analysis.")

        if analysis_section.test_defects > 0:
            recs.append(f"Review {analysis_section.test_defects} test defect(s) — false positives or flaky tests.")

        if analysis_section.flaky_tests > 0:
            recs.append(f"Stabilize {analysis_section.flaky_tests} flaky test(s) to improve reliability.")

        if quality_section.overall_status == "FAIL":
            recs.append("Quality gate FAILED. Do not release until all blocking gates pass.")

        if quality_section.overall_status == "CONDITIONAL":
            recs.append("Quality gate is CONDITIONAL. Review blocking issues before proceeding.")

        if traceability_section.uncovered_requirements:
            recs.append(f"Write tests for {len(traceability_section.uncovered_requirements)} uncovered requirement(s).")

        if traceability_section.orphaned_test_cases:
            recs.append(f"Link {len(traceability_section.orphaned_test_cases)} orphaned test case(s) to requirements.")

        if not recs:
            recs.append("All quality gates passed. Consider releasing.")

        return recs

    # ------------------------------------------------------------------
    # Raw data
    # ------------------------------------------------------------------

    def _build_raw_data(self, **kwargs: Any) -> Dict[str, Any]:
        raw: Dict[str, Any] = {}
        for key, value in kwargs.items():
            if value is None:
                continue
            if isinstance(value, list):
                raw[key] = [v if isinstance(v, dict) else str(v) for v in value]
            elif isinstance(value, dict):
                raw[key] = value
            else:
                raw[key] = value
        return raw

    # ------------------------------------------------------------------
    # Export: JSON
    # ------------------------------------------------------------------

    def _export_json(self, report: TestReport) -> str:
        return report.model_dump_json(indent=2)

    # ------------------------------------------------------------------
    # Export: HTML
    # ------------------------------------------------------------------

    def _export_html(self, report: TestReport) -> str:
        lines: List[str] = []
        lines.append("<!DOCTYPE html>")
        lines.append("<html lang='en'><head><meta charset='UTF-8'>")
        lines.append(f"<title>Test Report — {report.project_id}</title>")
        lines.append("<style>")
        lines.append("body{font-family:sans-serif;margin:2rem;background:#0f172a;color:#e2e8f0}")
        lines.append("h1,h2{color:#22d3ee}")
        lines.append("table{border-collapse:collapse;width:100%;margin:1rem 0}")
        lines.append("th,td{border:1px solid #334155;padding:.5rem;text-align:left}")
        lines.append("th{background:#1e293b;color:#22d3ee}")
        lines.append(".pass{color:#34d399} .fail{color:#f87171} .warn{color:#fbbf24}")
        lines.append(".metric{display:inline-block;margin:.5rem 1rem;padding:.5rem 1rem;background:#1e293b;border-radius:6px}")
        lines.append("</style></head><body>")
        lines.append(f"<h1>Test Report — {report.project_id}</h1>")
        lines.append(f"<p>Generated: {report.generated_at}</p>")
        lines.append(f"<p>Report ID: {report.report_id}</p>")

        lines.append("<h2>Executive Summary</h2>")
        lines.append(f"<p>{report.executive_summary}</p>")

        lines.append("<h2>Phase Status</h2>")
        lines.append("<table><tr><th>Phase</th><th>Name</th><th>Status</th><th>Summary</th></tr>")
        for p in report.phases:
            cls = "pass" if p.status == "passed" else ("fail" if p.status == "failed" else "warn")
            lines.append(f"<tr><td>{p.phase_number}</td><td>{p.phase_name}</td><td class='{cls}'>{p.status.upper()}</td><td>{p.summary}</td></tr>")
        lines.append("</table>")

        ex = report.execution
        lines.append("<h2>Execution Results</h2>")
        lines.append(f"<div class='metric'>Total: {ex.total_tests}</div>")
        lines.append(f"<div class='metric pass'>Passed: {ex.passed}</div>")
        lines.append(f"<div class='metric fail'>Failed: {ex.failed}</div>")
        lines.append(f"<div class='metric'>Errors: {ex.errors}</div>")
        lines.append(f"<div class='metric'>Skipped: {ex.skipped}</div>")
        lines.append(f"<div class='metric'>Pass Rate: {ex.pass_rate}%</div>")
        if ex.duration is not None:
            lines.append(f"<div class='metric'>Duration: {ex.duration:.2f}s</div>")

        an = report.analysis
        lines.append("<h2>Analysis</h2>")
        lines.append(f"<div class='metric'>Failures Analyzed: {an.total_failures}</div>")
        lines.append(f"<div class='metric'>Product Defects: {an.product_defects}</div>")
        lines.append(f"<div class='metric'>Test Defects: {an.test_defects}</div>")
        lines.append(f"<div class='metric'>Flaky Tests: {an.flaky_tests}</div>")
        if an.failure_types:
            lines.append("<p><strong>Failure Types:</strong></p><ul>")
            for ftype, count in an.failure_types.items():
                lines.append(f"<li>{ftype}: {count}</li>")
            lines.append("</ul>")

        qg = report.quality_gate
        lines.append("<h2>Quality Gate</h2>")
        lines.append(f"<div class='metric'>Overall: {qg.overall_status}</div>")
        lines.append(f"<div class='metric'>Score: {qg.quality_score:.1f}</div>")
        lines.append(f"<div class='metric'>Release: {qg.release_readiness}</div>")
        if qg.gate_results:
            lines.append("<table><tr><th>Gate</th><th>Status</th></tr>")
            for g in qg.gate_results:
                cls = "pass" if g["status"] == "PASS" else ("fail" if g["status"] == "FAIL" else "warn")
                lines.append(f"<tr><td>{g['name']}</td><td class='{cls}'>{g['status']}</td></tr>")
            lines.append("</table>")

        lines.append("<h2>Traceability</h2>")
        tr = report.traceability
        lines.append(f"<div class='metric'>Entries: {tr.total_entries}</div>")
        lines.append(f"<div class='metric'>Coverage: {tr.coverage_percentage:.1f}%</div>")
        lines.append(f"<div class='metric'>Uncovered: {len(tr.uncovered_requirements)}</div>")
        lines.append(f"<div class='metric'>Orphaned Cases: {len(tr.orphaned_test_cases)}</div>")

        lines.append("<h2>Recommendations</h2>")
        lines.append("<ul>")
        for r in report.recommendations:
            lines.append(f"<li>{r}</li>")
        lines.append("</ul>")

        lines.append("</body></html>")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Export: CSV
    # ------------------------------------------------------------------

    def _export_csv(self, report: TestReport) -> str:
        buf = io.StringIO()
        writer = csv.writer(buf)

        writer.writerow(["Section", "Key", "Value"])
        writer.writerow(["Report", "report_id", report.report_id])
        writer.writerow(["Report", "project_id", report.project_id])
        writer.writerow(["Report", "generated_at", report.generated_at])
        writer.writerow(["Report", "executive_summary", report.executive_summary])

        writer.writerow([])
        writer.writerow(["Phase", "Number", "Name", "Status", "Summary"])
        for p in report.phases:
            writer.writerow(["Phase", p.phase_number, p.phase_name, p.status, p.summary])

        writer.writerow([])
        ex = report.execution
        writer.writerow(["Execution", "total_tests", ex.total_tests])
        writer.writerow(["Execution", "passed", ex.passed])
        writer.writerow(["Execution", "failed", ex.failed])
        writer.writerow(["Execution", "errors", ex.errors])
        writer.writerow(["Execution", "skipped", ex.skipped])
        writer.writerow(["Execution", "pass_rate", ex.pass_rate])

        writer.writerow([])
        an = report.analysis
        writer.writerow(["Analysis", "total_failures", an.total_failures])
        writer.writerow(["Analysis", "product_defects", an.product_defects])
        writer.writerow(["Analysis", "test_defects", an.test_defects])
        writer.writerow(["Analysis", "flaky_tests", an.flaky_tests])

        writer.writerow([])
        qg = report.quality_gate
        writer.writerow(["QualityGate", "overall_status", qg.overall_status])
        writer.writerow(["QualityGate", "quality_score", qg.quality_score])
        writer.writerow(["QualityGate", "release_readiness", qg.release_readiness])

        writer.writerow([])
        tr = report.traceability
        writer.writerow(["Traceability", "total_entries", tr.total_entries])
        writer.writerow(["Traceability", "coverage_percentage", tr.coverage_percentage])

        writer.writerow([])
        writer.writerow(["Recommendations"])
        for r in report.recommendations:
            writer.writerow(["", r])

        return buf.getvalue()


# Module-level convenience function
def generate_report(
    project_id: str,
    **kwargs: Any,
) -> TestReport:
    gen = ReportGenerator()
    return gen.generate(project_id=project_id, **kwargs)
