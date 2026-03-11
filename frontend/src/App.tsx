import { type ChangeEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Database,
  Download,
  FileInput,
  FileText,
  LayoutDashboard,
  ShieldCheck
} from "lucide-react";
import { EvidenceTable } from "./components/EvidenceTable";
import { FindingCard } from "./components/FindingCard";
import { MetricCard } from "./components/MetricCard";
import { PortfolioTable } from "./components/PortfolioTable";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import {
  analyzePolicy,
  fetchPolicies,
  fetchStats,
  portfolioScan,
  rebuildIndex,
  type AnalyzeResult,
  type LibraryStats,
  type PortfolioScanResult,
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
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioScanResult | null>(null);
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
      setAnalysisResult(result);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePortfolioScan() {
    setBusy(true);
    setMessage("");
    try {
      const result = await portfolioScan();
      setPortfolioResult(result);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFileLoad(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setPolicyText(text);
    setMessage(`Loaded ${file.name} into the editor.`);
  }

  function handleDownloadReport() {
    if (!analysisResult) {
      return;
    }
    const blob = new Blob([analysisResult.report_markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${analysisResult.analysis.policy_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const analysis = analysisResult?.analysis ?? null;
  const metrics = analysisResult?.metrics ?? null;

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
            <button className="secondary-button" onClick={handlePortfolioScan} disabled={busy}>
              Portfolio scan
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

          <div className="utility-row">
            <label className="file-button">
              <FileInput size={15} />
              Load `.txt` or `.md`
              <input type="file" accept=".txt,.md" onChange={handleFileLoad} />
            </label>
            <button className="ghost-button" onClick={() => setPolicyText("")} disabled={busy}>
              Clear editor
            </button>
          </div>

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
              <div className="score-strip score-strip-spread">
                <div>
                  <span className="metric-label">Overall score</span>
                  <strong className="score-value">{analysis.overall_score}</strong>
                </div>
                <div>
                  <span className="metric-label">Risk posture</span>
                  <strong className="score-value small">{analysis.risk_posture}</strong>
                </div>
                <button className="secondary-button" onClick={handleDownloadReport}>
                  <Download size={15} />
                  Export markdown report
                </button>
              </div>
              <p className="summary-copy">{analysis.executive_summary}</p>
              {metrics ? <ScoreBreakdown metrics={metrics} /> : null}
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

        <section className="portfolio-card">
          <div className="section-heading">
            <h2>Portfolio overview</h2>
            <p>Scan the seeded policy pack to prioritize review work across documents.</p>
          </div>
          {portfolioResult ? (
            <>
              <div className="portfolio-metrics">
                <MetricCard
                  label="Policies scanned"
                  value={portfolioResult.scanned_policies}
                  note="Seeded portfolio coverage"
                />
                <MetricCard
                  label="Average score"
                  value={portfolioResult.average_score}
                  note="Mean score across scanned policies"
                />
                <MetricCard
                  label="Highest risk"
                  value={portfolioResult.highest_risk_policy}
                  note="First policy requiring attention"
                />
                <MetricCard
                  label="Lowest score"
                  value={portfolioResult.lowest_score_policy}
                  note="Current weakest control set"
                />
              </div>
              <PortfolioTable summaries={portfolioResult.summaries} />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-copy">
                <LayoutDashboard size={18} />
                <p>Run a portfolio scan to compare policy risk across the seeded document set.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
