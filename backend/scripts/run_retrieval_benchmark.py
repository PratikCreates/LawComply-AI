import json
from pathlib import Path

from app.core.config import get_settings
from app.services.retrieval import RetrievalService, source_domain
from app.services.vector_store import ComplianceIndex


def reciprocal_rank(observed: list[str], expected: str) -> float:
    for rank, clause in enumerate(observed, start=1):
        if clause == expected:
            return 1.0 / rank
    return 0.0


def evaluate(strategy: str, top_k: int, cases: list[dict]) -> dict:
    service = RetrievalService(ComplianceIndex())
    rows: list[dict] = []
    recall_hits = 0
    mrr_total = 0.0
    in_domain_total = 0.0

    for case in cases:
        evidence = service.retrieve_evidence(case["query"], top_k=top_k, strategy=strategy)
        observed = [item.clause_id for item in evidence]
        hit = case["expected_primary"] in observed
        in_domain = sum(
            1 for item in evidence if source_domain(item.source_document) == case["domain"]
        ) / top_k
        recall_hits += int(hit)
        mrr_total += reciprocal_rank(observed, case["expected_primary"])
        in_domain_total += in_domain
        rows.append(
            {
                "case_id": case["case_id"],
                "expected_primary": case["expected_primary"],
                "observed": observed,
                "hit": hit,
                "in_domain_precision_at_k": round(in_domain, 4),
            }
        )

    total = len(cases)
    return {
        "strategy": strategy,
        "cases": total,
        "recall_at_k": round(recall_hits / total, 4) if total else 0.0,
        "mrr": round(mrr_total / total, 4) if total else 0.0,
        "in_domain_precision_at_k": round(in_domain_total / total, 4) if total else 0.0,
        "results": rows,
    }


def main() -> None:
    settings = get_settings()
    benchmark_path = settings.data_dir / "benchmarks" / "retrieval_eval_cases.json"
    cases = json.loads(benchmark_path.read_text(encoding="utf-8"))

    semantic = evaluate("semantic", top_k=5, cases=cases)
    hybrid = evaluate("hybrid", top_k=5, cases=cases)
    improvement = {
        "recall_at_5_delta": round(hybrid["recall_at_k"] - semantic["recall_at_k"], 4),
        "mrr_delta": round(hybrid["mrr"] - semantic["mrr"], 4),
        "in_domain_precision_delta": round(
            hybrid["in_domain_precision_at_k"] - semantic["in_domain_precision_at_k"], 4
        ),
    }
    report = {"semantic": semantic, "hybrid": hybrid, "improvement": improvement}

    output = Path("retrieval_benchmark_report.json")
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"\nSaved report to {output.resolve()}")


if __name__ == "__main__":
    main()
