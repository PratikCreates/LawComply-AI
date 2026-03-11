import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from uuid import uuid4

from app.core.config import get_settings
from app.models.schemas import (
    AnalyticsSummaryResponse,
    AnalyzeResponse,
    ClauseFrequency,
    CoverageMatrixResponse,
    CoverageMatrixRow,
    GapFrequency,
    PolicyRunSummary,
    RunHistoryEntry,
    RunHistoryResponse,
    ScoreTrendPoint,
)


class RunHistoryStore:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.path = self.settings.run_history_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("[]", encoding="utf-8")

    def _read(self) -> list[RunHistoryEntry]:
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        return [RunHistoryEntry.model_validate(item) for item in payload]

    def _write(self, items: list[RunHistoryEntry]) -> None:
        self.path.write_text(
            json.dumps([item.model_dump() for item in items], indent=2),
            encoding="utf-8",
        )

    def record_run(self, response: AnalyzeResponse, analysis_mode: str) -> RunHistoryEntry:
        entry = RunHistoryEntry(
            run_id=str(uuid4()),
            created_at=datetime.now(timezone.utc).isoformat(),
            policy_name=response.analysis.policy_name,
            analysis_mode="sample" if analysis_mode == "sample" else "ad_hoc",
            overall_score=response.analysis.overall_score,
            risk_posture=response.analysis.risk_posture,
            finding_count=response.metrics.finding_count,
            critical_count=response.metrics.critical_count,
            cited_clause_count=response.metrics.cited_clause_count,
            top_findings=[finding.title for finding in response.analysis.findings[:3]],
            cited_clause_ids=sorted(
                {citation for finding in response.analysis.findings for citation in finding.citation_ids}
            ),
        )
        items = self._read()
        items.insert(0, entry)
        self._write(items[:100])
        return entry

    def history(self, limit: int = 25) -> RunHistoryResponse:
        return RunHistoryResponse(items=self._read()[:limit])

    def analytics_summary(self) -> AnalyticsSummaryResponse:
        items = self._read()
        if not items:
            return AnalyticsSummaryResponse(
                total_runs=0,
                average_score=0.0,
                poor_runs=0,
                watch_runs=0,
                adequate_runs=0,
                strong_runs=0,
                policy_breakdown=[],
                top_clauses=[],
                top_gaps=[],
                score_trend=[],
            )

        policy_scores: dict[str, list[int]] = defaultdict(list)
        clause_counter: Counter[str] = Counter()
        gap_counter: Counter[str] = Counter()
        posture_counter: Counter[str] = Counter()
        trend: list[ScoreTrendPoint] = []

        for item in items:
            policy_scores[item.policy_name].append(item.overall_score)
            clause_counter.update(item.cited_clause_ids)
            gap_counter.update(item.top_findings)
            posture_counter.update([item.risk_posture])
            trend.append(
                ScoreTrendPoint(
                    created_at=item.created_at,
                    policy_name=item.policy_name,
                    overall_score=item.overall_score,
                )
            )

        policy_breakdown = [
            PolicyRunSummary(
                policy_name=name,
                runs=len(scores),
                average_score=round(sum(scores) / len(scores), 2),
            )
            for name, scores in policy_scores.items()
        ]
        policy_breakdown.sort(key=lambda item: item.average_score)

        return AnalyticsSummaryResponse(
            total_runs=len(items),
            average_score=round(sum(item.overall_score for item in items) / len(items), 2),
            poor_runs=posture_counter.get("poor", 0),
            watch_runs=posture_counter.get("watch", 0),
            adequate_runs=posture_counter.get("adequate", 0),
            strong_runs=posture_counter.get("strong", 0),
            policy_breakdown=policy_breakdown,
            top_clauses=[ClauseFrequency(clause_id=clause, count=count) for clause, count in clause_counter.most_common(8)],
            top_gaps=[GapFrequency(title=title, count=count) for title, count in gap_counter.most_common(8)],
            score_trend=trend[:20],
        )

    def coverage_matrix(self) -> CoverageMatrixResponse:
        items = self._read()
        clause_ids = sorted({clause for item in items for clause in item.cited_clause_ids})
        latest_by_policy: dict[str, RunHistoryEntry] = {}
        for item in items:
            latest_by_policy.setdefault(item.policy_name, item)

        rows = []
        for policy_name, item in latest_by_policy.items():
            row = {clause_id: int(clause_id in item.cited_clause_ids) for clause_id in clause_ids}
            rows.append(CoverageMatrixRow(policy_name=policy_name, clauses=row))
        rows.sort(key=lambda row: row.policy_name)
        return CoverageMatrixResponse(clause_ids=clause_ids, rows=rows)

    def export_csv(self) -> str:
        items = self._read()
        lines = [
            "run_id,created_at,policy_name,analysis_mode,overall_score,risk_posture,finding_count,critical_count,cited_clause_count,top_findings"
        ]
        for item in items:
            top_findings = " | ".join(item.top_findings).replace('"', "'")
            lines.append(
                f'{item.run_id},{item.created_at},"{item.policy_name}",{item.analysis_mode},{item.overall_score},{item.risk_posture},{item.finding_count},{item.critical_count},{item.cited_clause_count},"{top_findings}"'
            )
        return "\n".join(lines)
