from app.models.schemas import ComplianceAnalysis, EvidenceItem, GapFinding
from app.services.reporting import AnalysisReporter


def build_analysis() -> ComplianceAnalysis:
    return ComplianceAnalysis(
        policy_name="Portfolio Policy",
        executive_summary="Summary",
        overall_score=63,
        risk_posture="watch",
        findings=[
            GapFinding(
                title="Missing retention schedule",
                severity="critical",
                status="gap",
                rationale="No explicit schedule is defined.",
                remediation="Publish retention schedule.",
                citation_ids=["GDPR-ART-13", "GDPR-ART-30"],
            ),
            GapFinding(
                title="Deletion process is partial",
                severity="medium",
                status="partial",
                rationale="Request intake exists without exception handling.",
                remediation="Define exception workflow.",
                citation_ids=["GDPR-ART-17"],
            ),
        ],
        evidence=[
            EvidenceItem(
                clause_id="GDPR-ART-13",
                source_document="gdpr_simulated.md",
                excerpt="Notice describing retention periods.",
                score=0.81,
            ),
            EvidenceItem(
                clause_id="GDPR-ART-17",
                source_document="gdpr_simulated.md",
                excerpt="Support deletion requests.",
                score=0.75,
            ),
            EvidenceItem(
                clause_id="GDPR-ART-30",
                source_document="gdpr_simulated.md",
                excerpt="Maintain records of processing.",
                score=0.73,
            ),
        ],
    )


def test_metrics_are_derived_consistently() -> None:
    analysis = build_analysis()
    metrics = AnalysisReporter().build_metrics(analysis)
    assert metrics.finding_count == 2
    assert metrics.critical_count == 1
    assert metrics.gap_count == 1
    assert metrics.partial_count == 1
    assert metrics.cited_clause_count == 3
    assert metrics.evidence_coverage_ratio == 1.0


def test_markdown_report_contains_key_sections() -> None:
    analysis = build_analysis()
    reporter = AnalysisReporter()
    metrics = reporter.build_metrics(analysis)
    markdown = reporter.render_markdown(analysis, metrics)
    assert "# Portfolio Policy Compliance Report" in markdown
    assert "## Analysis metrics" in markdown
    assert "## Findings" in markdown
    assert "## Evidence pack" in markdown
