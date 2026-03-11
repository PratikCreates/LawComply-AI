import type { AnalysisMetrics } from "../lib/api";

type ScoreBreakdownProps = {
  metrics: AnalysisMetrics;
};

export function ScoreBreakdown({ metrics }: ScoreBreakdownProps) {
  return (
    <div className="score-breakdown">
      <div className="breakdown-card">
        <span className="field-label">Findings</span>
        <strong>{metrics.finding_count}</strong>
        <p>
          {metrics.gap_count} gaps, {metrics.partial_count} partial, {metrics.aligned_count} aligned.
        </p>
      </div>
      <div className="breakdown-card">
        <span className="field-label">Severity mix</span>
        <strong>{metrics.critical_count + metrics.high_count}</strong>
        <p>
          {metrics.critical_count} critical and {metrics.high_count} high-severity issues.
        </p>
      </div>
      <div className="breakdown-card">
        <span className="field-label">Citation coverage</span>
        <strong>{Math.round(metrics.evidence_coverage_ratio * 100)}%</strong>
        <p>{metrics.cited_clause_count} clauses made it into the final report.</p>
      </div>
      <div className="breakdown-card">
        <span className="field-label">Evidence quality</span>
        <strong>{metrics.average_evidence_score.toFixed(2)}</strong>
        <p>Average retrieval score across the locked evidence pack.</p>
      </div>
    </div>
  );
}
