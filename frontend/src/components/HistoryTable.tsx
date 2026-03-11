import type { RunHistoryEntry } from "../lib/api";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function HistoryTable({ items }: { items: RunHistoryEntry[] }) {
  return (
    <div className="history-table">
      <div className="table-head history-head">
        <span>Run</span>
        <span>Score</span>
        <span>Risk</span>
        <span>Top findings</span>
      </div>
      {items.map((item) => (
        <div className="table-row history-row" key={item.run_id}>
          <div>
            <strong>{item.policy_name}</strong>
            <p>{formatTimestamp(item.created_at)}</p>
          </div>
          <span>{item.overall_score}</span>
          <span className="risk-chip">{item.risk_posture}</span>
          <p>{item.top_findings.join(" | ")}</p>
        </div>
      ))}
    </div>
  );
}
