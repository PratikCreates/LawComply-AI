from typing import Literal

from pydantic import BaseModel, Field, model_validator


Severity = Literal["critical", "high", "medium", "low"]
GapStatus = Literal["gap", "partial", "aligned"]


class EvidenceItem(BaseModel):
    clause_id: str
    source_document: str
    excerpt: str
    score: float


class GapFinding(BaseModel):
    title: str
    severity: Severity
    status: GapStatus
    rationale: str
    remediation: str
    citation_ids: list[str] = Field(default_factory=list)


class ComplianceAnalysis(BaseModel):
    policy_name: str
    executive_summary: str
    overall_score: int = Field(ge=0, le=100)
    risk_posture: Literal["poor", "watch", "adequate", "strong"]
    findings: list[GapFinding]
    evidence: list[EvidenceItem]

    @model_validator(mode="after")
    def ensure_citations_present(self) -> "ComplianceAnalysis":
        if not self.findings:
            raise ValueError("At least one finding is required.")
        return self


class AnalyzeRequest(BaseModel):
    policy_id: str | None = None
    policy_name: str | None = None
    policy_text: str | None = None
    top_k: int = Field(default=8, ge=3, le=16)

    @model_validator(mode="after")
    def validate_payload(self) -> "AnalyzeRequest":
        if not self.policy_id and not self.policy_text:
            raise ValueError("policy_id or policy_text is required.")
        return self


class AnalysisMetrics(BaseModel):
    finding_count: int
    gap_count: int
    partial_count: int
    aligned_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    cited_clause_count: int
    evidence_coverage_ratio: float = Field(ge=0.0, le=1.0)
    average_evidence_score: float


class AnalyzeResponse(BaseModel):
    analysis: ComplianceAnalysis
    metrics: AnalysisMetrics
    report_markdown: str


class PolicyRecord(BaseModel):
    id: str
    title: str
    body: str


class LibraryStats(BaseModel):
    regulation_documents: int
    regulation_clauses: int
    policy_documents: int
    vector_store_ready: bool


class PortfolioScanRequest(BaseModel):
    policy_ids: list[str] | None = None
    top_k: int = Field(default=8, ge=3, le=16)


class PortfolioPolicySummary(BaseModel):
    policy_id: str
    policy_name: str
    overall_score: int
    risk_posture: Literal["poor", "watch", "adequate", "strong"]
    finding_count: int
    critical_count: int
    cited_clause_count: int
    top_gaps: list[str]


class PortfolioScanResponse(BaseModel):
    scanned_policies: int
    average_score: float
    highest_risk_policy: str
    lowest_score_policy: str
    summaries: list[PortfolioPolicySummary]


class RunHistoryEntry(BaseModel):
    run_id: str
    created_at: str
    policy_name: str
    analysis_mode: Literal["sample", "ad_hoc"]
    overall_score: int
    risk_posture: Literal["poor", "watch", "adequate", "strong"]
    finding_count: int
    critical_count: int
    cited_clause_count: int
    top_findings: list[str]
    cited_clause_ids: list[str]


class RunHistoryResponse(BaseModel):
    items: list[RunHistoryEntry]


class PolicyRunSummary(BaseModel):
    policy_name: str
    runs: int
    average_score: float


class ClauseFrequency(BaseModel):
    clause_id: str
    count: int


class GapFrequency(BaseModel):
    title: str
    count: int


class ScoreTrendPoint(BaseModel):
    created_at: str
    policy_name: str
    overall_score: int


class AnalyticsSummaryResponse(BaseModel):
    total_runs: int
    average_score: float
    poor_runs: int
    watch_runs: int
    adequate_runs: int
    strong_runs: int
    policy_breakdown: list[PolicyRunSummary]
    top_clauses: list[ClauseFrequency]
    top_gaps: list[GapFrequency]
    score_trend: list[ScoreTrendPoint]


class CoverageMatrixRow(BaseModel):
    policy_name: str
    clauses: dict[str, int]


class CoverageMatrixResponse(BaseModel):
    clause_ids: list[str]
    rows: list[CoverageMatrixRow]


AnalyzeResponse.model_rebuild()
