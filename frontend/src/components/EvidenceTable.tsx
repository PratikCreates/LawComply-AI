import type { EvidenceItem } from "../lib/api";

export function EvidenceTable({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <div className="evidence-table">
      <div className="table-head">
        <span>Clause</span>
        <span>Source</span>
        <span>Retrieved excerpt</span>
      </div>
      {evidence.map((item) => (
        <div className="table-row" key={item.clause_id}>
          <code>{item.clause_id}</code>
          <span>{item.source_document}</span>
          <p>{item.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

