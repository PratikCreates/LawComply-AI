from app.models.schemas import (
    AnalyticsSummaryResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    ComplianceAnalysis,
    CoverageMatrixResponse,
    EvidenceItem,
    PolicyRecord,
    PortfolioPolicySummary,
    PortfolioScanRequest,
    PortfolioScanResponse,
    RunHistoryResponse,
)
from app.services.citation_guard import CitationGuard
from app.services.history import RunHistoryStore
from app.services.llm import ComplianceAgent
from app.services.reporting import AnalysisReporter
from app.services.repository import DocumentRepository
from app.services.retrieval import RetrievalService
from app.services.vector_store import ComplianceIndex


class ComplianceAnalysisService:
    def __init__(self) -> None:
        self.repository = DocumentRepository()
        self.index = ComplianceIndex()
        self.agent = ComplianceAgent()
        self.guard = CitationGuard()
        self.reporter = AnalysisReporter()
        self.history_store = RunHistoryStore()

    def rebuild_index(self) -> int:
        files = self.repository.list_regulation_files()
        return self.index.rebuild(files)

    def list_policies(self) -> list[PolicyRecord]:
        return self.repository.list_policies()

    def get_stats(self) -> dict:
        regulations = self.index.build_documents(self.repository.list_regulation_files())
        return {
            "regulation_documents": len(self.repository.list_regulation_files()),
            "regulation_clauses": len(regulations),
            "policy_documents": len(self.repository.list_policies()),
            "vector_store_ready": self.index.is_ready(),
        }

    def _resolve_policy(self, request: AnalyzeRequest) -> tuple[PolicyRecord, str]:
        if request.policy_id:
            return self.repository.get_policy(request.policy_id), "sample"
        assert request.policy_text is not None
        title = request.policy_name or "Ad hoc policy submission"
        return PolicyRecord(id="ad_hoc.md", title=title, body=request.policy_text), "ad_hoc"

    @staticmethod
    def _format_evidence(evidence: list[EvidenceItem]) -> str:
        blocks = []
        for item in evidence:
            blocks.append(
                f"[{item.clause_id}] ({item.source_document}) score={item.score}\n{item.excerpt}"
            )
        return "\n\n".join(blocks)

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        if not self.index.is_ready():
            self.rebuild_index()
        policy, analysis_mode = self._resolve_policy(request)
        retriever = RetrievalService(self.index)
        evidence = retriever.retrieve_evidence(policy.body, top_k=request.top_k)
        analysis: ComplianceAnalysis = self.agent.analyze(
            policy_name=policy.title,
            policy_text=policy.body,
            evidence_pack=self._format_evidence(evidence),
            evidence=evidence,
        )
        validated = self.guard.validate(analysis)
        metrics = self.reporter.build_metrics(validated)
        report_markdown = self.reporter.render_markdown(validated, metrics)
        response = AnalyzeResponse(analysis=validated, metrics=metrics, report_markdown=report_markdown)
        self.history_store.record_run(response, analysis_mode=analysis_mode)
        return response

    def portfolio_scan(self, request: PortfolioScanRequest) -> PortfolioScanResponse:
        available_policies = {policy.id: policy for policy in self.repository.list_policies()}
        selected_ids = request.policy_ids or list(available_policies.keys())
        summaries: list[PortfolioPolicySummary] = []

        for policy_id in selected_ids:
            if policy_id not in available_policies:
                raise FileNotFoundError(f"Unknown policy '{policy_id}'.")
            response = self.analyze(AnalyzeRequest(policy_id=policy_id, top_k=request.top_k))
            summaries.append(
                PortfolioPolicySummary(
                    policy_id=policy_id,
                    policy_name=response.analysis.policy_name,
                    overall_score=response.analysis.overall_score,
                    risk_posture=response.analysis.risk_posture,
                    finding_count=response.metrics.finding_count,
                    critical_count=response.metrics.critical_count,
                    cited_clause_count=response.metrics.cited_clause_count,
                    top_gaps=[finding.title for finding in response.analysis.findings[:3]],
                )
            )

        ranked = sorted(summaries, key=lambda item: item.overall_score)
        average_score = round(sum(item.overall_score for item in summaries) / len(summaries), 2)
        highest_risk_policy = next(
            (item.policy_name for item in summaries if item.risk_posture in {"poor", "watch"}),
            ranked[0].policy_name,
        )
        return PortfolioScanResponse(
            scanned_policies=len(summaries),
            average_score=average_score,
            highest_risk_policy=highest_risk_policy,
            lowest_score_policy=ranked[0].policy_name,
            summaries=ranked,
        )

    def history(self) -> RunHistoryResponse:
        return self.history_store.history()

    def analytics_summary(self) -> AnalyticsSummaryResponse:
        return self.history_store.analytics_summary()

    def coverage_matrix(self) -> CoverageMatrixResponse:
        return self.history_store.coverage_matrix()

    def history_csv(self) -> str:
        return self.history_store.export_csv()
