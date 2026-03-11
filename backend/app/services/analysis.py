from app.models.schemas import AnalyzeRequest, AnalyzeResponse, ComplianceAnalysis, EvidenceItem, PolicyRecord
from app.services.citation_guard import CitationGuard
from app.services.llm import ComplianceAgent
from app.services.repository import DocumentRepository
from app.services.retrieval import RetrievalService
from app.services.vector_store import ComplianceIndex


class ComplianceAnalysisService:
    def __init__(self) -> None:
        self.repository = DocumentRepository()
        self.index = ComplianceIndex()
        self.agent = ComplianceAgent()
        self.guard = CitationGuard()

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

    def _resolve_policy(self, request: AnalyzeRequest) -> PolicyRecord:
        if request.policy_id:
            return self.repository.get_policy(request.policy_id)
        assert request.policy_text is not None
        return PolicyRecord(id="ad_hoc.md", title="Ad hoc policy submission", body=request.policy_text)

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
        policy = self._resolve_policy(request)
        retriever = RetrievalService(self.index)
        evidence = retriever.retrieve_evidence(policy.body, top_k=request.top_k)
        analysis: ComplianceAnalysis = self.agent.analyze(
            policy_name=policy.title,
            policy_text=policy.body,
            evidence_pack=self._format_evidence(evidence),
            evidence=evidence,
        )
        validated = self.guard.validate(analysis)
        return AnalyzeResponse(analysis=validated)
