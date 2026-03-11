from app.models.schemas import ComplianceAnalysis


class CitationValidationError(ValueError):
    pass


class CitationGuard:
    def validate(self, analysis: ComplianceAnalysis) -> ComplianceAnalysis:
        allowed_ids = {item.clause_id for item in analysis.evidence}
        if not allowed_ids:
            raise CitationValidationError("No evidence pack was attached to the analysis.")
        for finding in analysis.findings:
            if not finding.citation_ids:
                raise CitationValidationError(f"Finding '{finding.title}' has no citations.")
            unsupported = [citation for citation in finding.citation_ids if citation not in allowed_ids]
            if unsupported:
                raise CitationValidationError(
                    f"Finding '{finding.title}' cites unsupported clauses: {', '.join(unsupported)}"
                )
        return analysis

