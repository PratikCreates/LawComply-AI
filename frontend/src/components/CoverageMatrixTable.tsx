import type { CoverageMatrix } from "../lib/api";

export function CoverageMatrixTable({ matrix }: { matrix: CoverageMatrix }) {
  return (
    <div className="coverage-matrix">
      <div className="matrix-head">
        <span>Policy</span>
        {matrix.clause_ids.map((clauseId) => (
          <code key={clauseId}>{clauseId}</code>
        ))}
      </div>
      {matrix.rows.map((row) => (
        <div className="matrix-row" key={row.policy_name}>
          <strong>{row.policy_name}</strong>
          {matrix.clause_ids.map((clauseId) => (
            <span key={`${row.policy_name}-${clauseId}`} className={row.clauses[clauseId] ? "matrix-hit" : "matrix-miss"}>
              {row.clauses[clauseId] ? "1" : "0"}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
