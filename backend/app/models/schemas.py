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
    policy_text: str | None = None
    top_k: int = Field(default=8, ge=3, le=16)

    @model_validator(mode="after")
    def validate_payload(self) -> "AnalyzeRequest":
        if not self.policy_id and not self.policy_text:
            raise ValueError("policy_id or policy_text is required.")
        return self


class AnalyzeResponse(BaseModel):
    analysis: ComplianceAnalysis


class PolicyRecord(BaseModel):
    id: str
    title: str
    body: str


class LibraryStats(BaseModel):
    regulation_documents: int
    regulation_clauses: int
    policy_documents: int
    vector_store_ready: bool

