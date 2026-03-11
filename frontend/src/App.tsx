import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Database, FileText, ShieldCheck } from "lucide-react";
import { EvidenceTable } from "./components/EvidenceTable";
import { FindingCard } from "./components/FindingCard";
import { MetricCard } from "./components/MetricCard";
import {
  analyzePolicy,
  fetchPolicies,
  fetchStats,
  rebuildIndex,
  type ComplianceAnalysis,
  type LibraryStats,
  type PolicyRecord
} from "./lib/api";

const emptyStats: LibraryStats = {
  regulation_documents: 0,
  regulation_clauses: 0,
  policy_documents: 0,
  vector_store_ready: false
};

export default function App() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("");
  const [policyText, setPolicyText] = useState("");
  const [stats, setStats] = useState<LibraryStats>(emptyStats);
  const [analysis, setAnalysis] = useState<ComplianceAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    void Promise.all([fetchPolicies(), fetchStats()])
      .then(([policyList, libraryStats]) => {
        setPolicies(policyList);
        setStats(libraryStats);
        if (policyList.length > 0) {
          setSelectedPolicy(policyList[0].id);
        }
      })
      .catch((error: Error) => {
        setMessage(error.message);
      });
  }, []);

  async function handleIndexRebuild() {
    setBusy(true);
    setMessage("");
    try {
      const indexed = await rebuildIndex();
      const refreshed = await fetchStats();
      setStats(refreshed);
      setMessage(`Indexed ${indexed} clauses.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyze() {
    setBusy(true);
    setMessage("");
    try {
      const payload = policyText.trim()
        ? { policy_text: policyText, top_k: 8 }
        : { policy_id: selectedPolicy, top_k: 8 };
      const result = await analyzePolicy(payload);
      setAnalysis(result);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Regulatory Compliance Intelligence</p>
          <h1>Agentic RAG for auditable policy-to-regulation gap analysis.</h1>
          <p className="hero-text">
            LawComply AI indexes legal clauses, retrieves evidence against internal policies,
            and returns citation-locked findings that stand up in analyst review.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={handleAnalyze} disabled={busy}>
              Run analysis
              <ArrowRight size={16} />
            </button>
            <button className="secondary-button" onClick={handleIndexRebuild} disabled={busy}>
              Rebuild index
            </button>
          </div>
        </div>
        <section className="hero-panel">
          <div className="panel-row">
            <ShieldCheck size={18} />
            <span>Immutable citation validation</span>
          </div>
          <div className="panel-row">
            <Database size={18} />
            <span>Vectorized regulation corpus</span>
          </div>
          <div className="panel-row">
            <FileText size={18} />
            <span>Analyst-ready findings and remediation</span>
          </div>
        </section>
      </header>

      <main className="content-grid">
        <section className="stack">
          <div className="section-heading">
            <h2>Library status</h2>
            <p>Seeded data and vector store readiness.</p>
          </div>
          <div className="metric-grid">
            <MetricCard
              label="Regulation docs"
              value={stats.regulation_documents}
              note="Privacy and finance rule packs"
            />
            <MetricCard
              label="Indexed clauses"
              value={stats.regulation_clauses}
              note="Deterministic clause identifiers"
            />
            <MetricCard
              label="Policy docs"
              value={stats.policy_documents}
              note="Seeded corporate policy samples"
            />
            <MetricCard
              label="Vector store"
              value={stats.vector_store_ready ? "Ready" : "Pending"}
              note="Chroma persistence on local disk"
            />
          </div>
        </section>

        <section className="workspace-card">
          <div className="section-heading">
            <h2>Policy input</h2>
            <p>Choose a sample or paste a new policy for review.</p>
          </div>
          <label className="field-label" htmlFor="policy-select">
            Sample policy
          </label>
          <select
            id="policy-select"
            className="field"
            value={selectedPolicy}
            onChange={(event) => setSelectedPolicy(event.target.value)}
            disabled={busy}
          >
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.title}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="policy-text">
            Or paste policy text
          </label>
          <textarea
            id="policy-text"
            className="textarea"
            placeholder="Paste a corporate policy excerpt here."
            value={policyText}
            onChange={(event) => setPolicyText(event.target.value)}
          />

          {message ? (
            <div className="message-row">
              <AlertCircle size={16} />
              <span>{message}</span>
            </div>
          ) : null}
        </section>

        <section className="analysis-card">
          <div className="section-heading">
            <h2>Compliance verdict</h2>
            <p>Structured findings with locked citations.</p>
          </div>
          {analysis ? (
            <>
              <div className="score-strip">
                <div>
                  <span className="metric-label">Overall score</span>
                  <strong className="score-value">{analysis.overall_score}</strong>
                </div>
                <div>
                  <span className="metric-label">Risk posture</span>
                  <strong className="score-value small">{analysis.risk_posture}</strong>
                </div>
              </div>
              <p className="summary-copy">{analysis.executive_summary}</p>
              <div className="finding-list">
                {analysis.findings.map((finding) => (
                  <FindingCard key={finding.title} finding={finding} />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No analysis yet. Run the seeded pipeline to see auditable findings.</p>
            </div>
          )}
        </section>

        <section className="evidence-card">
          <div className="section-heading">
            <h2>Evidence pack</h2>
            <p>Retrieved clauses that the final answer is allowed to cite.</p>
          </div>
          {analysis ? (
            <EvidenceTable evidence={analysis.evidence} />
          ) : (
            <div className="empty-state">
              <p>Evidence appears here after a run.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

