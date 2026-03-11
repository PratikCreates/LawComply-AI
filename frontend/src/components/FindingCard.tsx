import type { GapFinding } from "../lib/api";

const severityClass: Record<GapFinding["severity"], string> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low"
};

export function FindingCard({ finding }: { finding: GapFinding }) {
  return (
    <article className="finding-card">
      <div className="finding-heading">
        <div>
          <p className="eyebrow">{finding.status}</p>
          <h3>{finding.title}</h3>
        </div>
        <span className={`severity-pill ${severityClass[finding.severity]}`}>
          {finding.severity}
        </span>
      </div>
      <p>{finding.rationale}</p>
      <div className="finding-block">
        <span>Recommended action</span>
        <p>{finding.remediation}</p>
      </div>
      <div className="citation-row">
        {finding.citation_ids.map((citation) => (
          <code key={citation}>{citation}</code>
        ))}
      </div>
    </article>
  );
}

