import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Database,
  Download,
  FileInput,
  LayoutDashboard,
  Library,
  RefreshCw,
  ShieldCheck,
  Sparkles
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
  type PolicyRecord,
  type PortfolioScanResult
} from "./lib/api";
import {
  buildActionRoadmap,
  buildInsightCards,
  policyTitleFromFileName,
  samplePreview
} from "./lib/workspace";

const emptyStats: LibraryStats = {
  regulation_documents: 0,
  regulation_clauses: 0,
  policy_documents: 0,
  vector_store_ready: false
};

export default function App() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("");
  const [workingTitle, setWorkingTitle] = useState("Working Policy Draft");
  const [policyText, setPolicyText] = useState("");
  const [stats, setStats] = useState<LibraryStats>(emptyStats);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [busyAction, setBusyAction] = useState<"analysis" | "portfolio" | "index" | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void Promise.all([fetchPolicies(), fetchStats()])
      .then(([policyList, libraryStats]) => {
        setPolicies(policyList);
        setStats(libraryStats);
        if (policyList.length > 0) {
          loadPolicy(policyList[0]);
        }
      })
      .catch((error: Error) => {
        setMessage(error.message);
      });
  }, []);

  useEffect(() => {
    if (analysisResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [analysisResult]);

  function loadPolicy(policy: PolicyRecord) {
    setSelectedPolicy(policy.id);
    setWorkingTitle(policy.title);
    setPolicyText(policy.body);
    setMessage(`Loaded ${policy.title} into the working editor.`);
  }

  async function handleIndexRebuild() {
    setBusy(true);
    setBusyAction("index");
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
      setBusyAction(null);
    }
  }

  async function handleAnalyze() {
    setBusy(true);
    setBusyAction("analysis");
    setMessage("");
    try {
      const result = await analyzePolicy({
        policy_name: workingTitle.trim() || "Working Policy Draft",
        policy_text: policyText,
        top_k: 8
      });
      setAnalysisResult(result);
      setMessage(`Analysis complete for ${result.analysis.policy_name}.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function handlePortfolioScan() {
    setBusy(true);
    setBusyAction("portfolio");
    setMessage("");
    try {
      const result = await portfolioScan();
      setPortfolioResult(result);
      setMessage(`Portfolio scan completed across ${result.scanned_policies} policies.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function handleFileLoad(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setPolicyText(text);
    setWorkingTitle(policyTitleFromFileName(file.name));
    setSelectedPolicy("");
    setMessage(`Loaded ${file.name} into the working editor.`);
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
  const insightCards = analysis && metrics ? buildInsightCards(analysis, metrics) : [];
  const actionRoadmap = analysis ? buildActionRoadmap(analysis.findings) : [];

  return (
    <div className="shell workspace-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Regulatory Compliance Intelligence</p>
          <h1>Built for policy review, evidence mapping, and remediation planning.</h1>
          <p className="hero-text compact">
            Load a seeded policy, edit it in place, run the compliance pass, and move directly into
            prioritized actions instead of scanning raw output.
          </p>
        </div>
        <div className="topbar-badges">
          <span><ShieldCheck size={16} /> Citation-locked</span>
          <span><Database size={16} /> Vector-backed</span>
          <span><Sparkles size={16} /> Analyst workflow</span>
        </div>
      </header>

      <main className="workspace-layout">
        <aside className="sidebar-column">
          <section className="panel sticky-panel">
            <div className="section-heading compact-heading">
              <h2>Control center</h2>
              <p>Run the workflow from here. Results land in the main workspace immediately to the right.</p>
            </div>
            <div className="action-stack">
              <button className="primary-button block-button" onClick={handleAnalyze} disabled={busy}>
                {busyAction === "analysis" ? "Running analysis..." : "Run analysis"}
                <ArrowRight size={16} />
              </button>
              <button className="secondary-button block-button" onClick={handlePortfolioScan} disabled={busy}>
                {busyAction === "portfolio" ? "Scanning portfolio..." : "Portfolio scan"}
              </button>
              <button className="ghost-button block-button" onClick={handleIndexRebuild} disabled={busy}>
                <RefreshCw size={15} />
                {busyAction === "index" ? "Rebuilding index..." : "Rebuild index"}
              </button>
            </div>
            <div className="mini-metrics">
              <MetricCard label="Regulation docs" value={stats.regulation_documents} note="Seeded legal packs" />
              <MetricCard label="Indexed clauses" value={stats.regulation_clauses} note="Deterministic evidence set" />
              <MetricCard label="Policy docs" value={stats.policy_documents} note="Ready-to-run examples" />
              <MetricCard label="Vector store" value={stats.vector_store_ready ? "Ready" : "Pending"} note="Local Chroma state" />
            </div>
            {message ? (
              <div className="message-row"><AlertCircle size={16} /><span>{message}</span></div>
            ) : null}
            {busyAction === "analysis" ? (
              <div className="info-row">
                <span>The model is running now. Typical response time is around 10-15 seconds on the current setup.</span>
              </div>
            ) : null}
          </section>

          <section className="panel">
            <div className="section-heading compact-heading">
              <h2>Sample pack</h2>
              <p>Click any seeded policy to load it into the editor below before running analysis.</p>
            </div>
            <div className="sample-list">
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  className={`sample-card ${selectedPolicy === policy.id ? "active" : ""}`}
                  onClick={() => loadPolicy(policy)}
                  disabled={busy}
                >
                  <div>
                    <strong>{policy.title}</strong>
                    <p>{samplePreview(policy)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-heading compact-heading">
              <h2>Working policy</h2>
              <p>The text in this editor is the exact content that will be analyzed.</p>
            </div>
            <label className="field-label" htmlFor="policy-title">Policy title</label>
            <input
              id="policy-title"
              className="field"
              value={workingTitle}
              onChange={(event) => setWorkingTitle(event.target.value)}
              disabled={busy}
            />
            <label className="field-label" htmlFor="policy-text">Policy body</label>
            <textarea
              id="policy-text"
              className="textarea tall"
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
          </section>
        </aside>

        <section className="results-column" ref={resultsRef}>
          {analysis && metrics ? (
            <>
              <section className="panel result-hero">
                <div className="result-hero-main">
                  <p className="eyebrow">Current assessment</p>
                  <h2>{analysis.policy_name}</h2>
                  <p className="summary-copy">{analysis.executive_summary}</p>
                </div>
                <div className="score-cluster">
                  <div>
                    <span className="metric-label">Score</span>
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
              </section>

              <section className="insight-grid">
                {insightCards.map((card) => (
                  <article className="panel insight-card" key={card.label}>
                    <span className="field-label">{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.note}</p>
                  </article>
                ))}
              </section>

              <section className="panel">
                <div className="section-heading compact-heading">
                  <h2>Score breakdown</h2>
                  <p>Use the scorecards to understand why the result landed where it did.</p>
                </div>
                <ScoreBreakdown metrics={metrics} />
              </section>

              <section className="panel">
                <div className="section-heading compact-heading">
                  <h2>Action roadmap</h2>
                  <p>Top remediation items grouped into near-term execution windows.</p>
                </div>
                <div className="roadmap-grid">
                  {actionRoadmap.map((action) => (
                    <article className="roadmap-card" key={`${action.horizon}-${action.title}`}>
                      <span className="field-label">{action.horizon}</span>
                      <h3>{action.title}</h3>
                      <p>{action.note}</p>
                      <div className="citation-row compact-citations">
                        {action.citations.map((citation) => (
                          <code key={citation}>{citation}</code>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-heading compact-heading">
                  <h2>Findings</h2>
                  <p>Detailed gap analysis with remediation guidance and clause-level support.</p>
                </div>
                <div className="finding-list">
                  {analysis.findings.map((finding) => (
                    <FindingCard key={finding.title} finding={finding} />
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-heading compact-heading">
                  <h2>Evidence pack</h2>
                  <p>Every conclusion above is constrained to these retrieved regulatory clauses.</p>
                </div>
                <EvidenceTable evidence={analysis.evidence} />
              </section>
            </>
          ) : (
            <section className="panel onboarding-panel">
              <Library size={18} />
              <div>
                <h2>No analysis loaded yet</h2>
                <p>
                  Choose one of the seeded policies from the left, review the text in the editor,
                  and click <strong>Run analysis</strong>. The summary, action roadmap, findings,
                  and evidence pack will appear here in the order an analyst would read them.
                </p>
              </div>
            </section>
          )}

          <section className="panel">
            <div className="section-heading compact-heading">
              <h2>Portfolio overview</h2>
              <p>Compare the seeded policy set and identify which document deserves attention first.</p>
            </div>
            {portfolioResult ? (
              <>
                <div className="portfolio-metrics">
                  <MetricCard label="Policies scanned" value={portfolioResult.scanned_policies} note="Seeded portfolio coverage" />
                  <MetricCard label="Average score" value={portfolioResult.average_score} note="Mean control health" />
                  <MetricCard label="Highest risk" value={portfolioResult.highest_risk_policy} note="First review target" />
                  <MetricCard label="Lowest score" value={portfolioResult.lowest_score_policy} note="Current weakest policy" />
                </div>
                <PortfolioTable summaries={portfolioResult.summaries} />
              </>
            ) : (
              <div className="empty-state compact-empty">
                <div className="empty-state-copy">
                  <LayoutDashboard size={18} />
                  <p>Run a portfolio scan to populate the cross-policy risk table.</p>
                </div>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
