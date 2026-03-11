from app.models.schemas import AnalysisMetrics, ComplianceAnalysis


class AnalysisReporter:
    def build_metrics(self, analysis: ComplianceAnalysis) -> AnalysisMetrics:
        finding_count = len(analysis.findings)
        cited_ids = {citation for finding in analysis.findings for citation in finding.citation_ids}
        evidence_ids = {item.clause_id for item in analysis.evidence}
        average_evidence_score = (
            round(sum(item.score for item in analysis.evidence) / len(analysis.evidence), 4)
            if analysis.evidence
            else 0.0
        )
        return AnalysisMetrics(
            finding_count=finding_count,
            gap_count=sum(1 for finding in analysis.findings if finding.status == "gap"),
            partial_count=sum(1 for finding in analysis.findings if finding.status == "partial"),
            aligned_count=sum(1 for finding in analysis.findings if finding.status == "aligned"),
            critical_count=sum(1 for finding in analysis.findings if finding.severity == "critical"),
            high_count=sum(1 for finding in analysis.findings if finding.severity == "high"),
            medium_count=sum(1 for finding in analysis.findings if finding.severity == "medium"),
            low_count=sum(1 for finding in analysis.findings if finding.severity == "low"),
            cited_clause_count=len(cited_ids),
            evidence_coverage_ratio=round(len(cited_ids) / len(evidence_ids), 4) if evidence_ids else 0.0,
            average_evidence_score=average_evidence_score,
        )

    def render_markdown(self, analysis: ComplianceAnalysis, metrics: AnalysisMetrics) -> str:
        finding_blocks = []
        for finding in analysis.findings:
            citations = ", ".join(finding.citation_ids)
            finding_blocks.append(
                "\n".join(
                    [
                        f"## {finding.title}",
                        f"- Severity: {finding.severity}",
                        f"- Status: {finding.status}",
                        f"- Citations: {citations}",
                        "",
                        f"Rationale: {finding.rationale}",
                        "",
                        f"Remediation: {finding.remediation}",
                    ]
                )
            )

        evidence_blocks = []
        for item in analysis.evidence:
            evidence_blocks.append(
                "\n".join(
                    [
                        f"### {item.clause_id} ({item.source_document})",
                        f"- Retrieval score: {item.score}",
                        "",
                        item.excerpt,
                    ]
                )
            )

        return "\n\n".join(
            [
                f"# {analysis.policy_name} Compliance Report",
                "",
                f"Overall score: **{analysis.overall_score}/100**",
                f"Risk posture: **{analysis.risk_posture}**",
                "",
                "## Executive summary",
                analysis.executive_summary,
                "",
                "## Analysis metrics",
                f"- Findings: {metrics.finding_count}",
                f"- Gaps: {metrics.gap_count}",
                f"- Partial controls: {metrics.partial_count}",
                f"- Critical findings: {metrics.critical_count}",
                f"- Cited clauses: {metrics.cited_clause_count}",
                f"- Evidence coverage ratio: {metrics.evidence_coverage_ratio}",
                f"- Average evidence score: {metrics.average_evidence_score}",
                "",
                "## Findings",
                "\n\n".join(finding_blocks),
                "",
                "## Evidence pack",
                "\n\n".join(evidence_blocks),
            ]
        )
