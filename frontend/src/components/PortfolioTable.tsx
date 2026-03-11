import type { PortfolioPolicySummary } from "../lib/api";

export function PortfolioTable({ summaries }: { summaries: PortfolioPolicySummary[] }) {
  return (
    <div className="portfolio-table">
      <div className="table-head portfolio-head">
        <span>Policy</span>
        <span>Score</span>
        <span>Risk</span>
        <span>Top gaps</span>
      </div>
      {summaries.map((summary) => (
        <div className="table-row portfolio-row" key={summary.policy_id}>
          <strong>{summary.policy_name}</strong>
          <span>{summary.overall_score}</span>
          <span className="risk-chip">{summary.risk_posture}</span>
          <p>{summary.top_gaps.join(" | ")}</p>
        </div>
      ))}
    </div>
  );
}
