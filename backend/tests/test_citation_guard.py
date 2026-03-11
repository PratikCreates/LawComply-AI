import pytest

from app.models.schemas import ComplianceAnalysis, EvidenceItem, GapFinding
from app.services.citation_guard import CitationGuard, CitationValidationError


def build_analysis(citation_ids: list[str]) -> ComplianceAnalysis:
    return ComplianceAnalysis(
        policy_name="Test Policy",
        executive_summary="Summary",
        overall_score=72,
        risk_posture="watch",
        findings=[
            GapFinding(
                title="Retention notice is incomplete",
                severity="high",
                status="gap",
                rationale="Retention periods are missing.",
                remediation="Publish retention schedules.",
                citation_ids=citation_ids,
            )
        ],
        evidence=[
            EvidenceItem(
                clause_id="GDPR-ART-13",
                source_document="gdpr_simulated.md",
                excerpt="Notice must include retention periods.",
                score=0.81,
            )
        ],
    )


def test_accepts_supported_citations() -> None:
    analysis = build_analysis(["GDPR-ART-13"])
    validated = CitationGuard().validate(analysis)
    assert validated.findings[0].citation_ids == ["GDPR-ART-13"]


def test_rejects_unsupported_citations() -> None:
    analysis = build_analysis(["GDPR-ART-99"])
    with pytest.raises(CitationValidationError):
        CitationGuard().validate(analysis)

