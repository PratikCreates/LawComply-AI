import json
from pathlib import Path

from app.core.config import get_settings
from app.models.schemas import AnalyzeRequest
from app.services.analysis import ComplianceAnalysisService


def main() -> None:
    settings = get_settings()
    benchmark_path = settings.data_dir / "benchmarks" / "baseline_cases.json"
    cases = json.loads(benchmark_path.read_text(encoding="utf-8"))
    service = ComplianceAnalysisService()

    passed = 0
    rows: list[dict] = []
    for case in cases:
        response = service.analyze(AnalyzeRequest(policy_id=case["policy_file"]))
        observed = {citation for finding in response.analysis.findings for citation in finding.citation_ids}
        expected = set(case["expected_citations"])
        matched = sorted(observed & expected)
        success = expected.issubset(observed)
        passed += int(success)
        rows.append(
            {
                "case_id": case["case_id"],
                "expected": sorted(expected),
                "observed": sorted(observed),
                "matched": matched,
                "pass": success,
                "overall_score": response.analysis.overall_score,
            }
        )

    report = {
        "cases": len(cases),
        "passed": passed,
        "pass_rate": round((passed / len(cases)) * 100, 2) if cases else 0.0,
        "results": rows,
    }
    output = Path("baseline_benchmark_report.json")
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nSaved report to {output.resolve()}")


if __name__ == "__main__":
    main()
