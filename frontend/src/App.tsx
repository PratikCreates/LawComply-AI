import { type ChangeEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Database,
  Download,
  FileInput,
  History,
  LayoutDashboard,
  Library,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TableProperties
} from "lucide-react";
import { CoverageMatrixTable } from "./components/CoverageMatrixTable";
import { EvidenceTable } from "./components/EvidenceTable";
import { FindingCard } from "./components/FindingCard";
import { HistoryTable } from "./components/HistoryTable";
import { MetricCard } from "./components/MetricCard";
import { PortfolioTable } from "./components/PortfolioTable";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import {
  analyzePolicy,
  fetchAnalyticsSummary,
  fetchCoverageMatrix,
  fetchHistory,
  fetchPolicies,
  fetchStats,
  historyCsvUrl,
  portfolioScan,
  rebuildIndex,
  type AnalyticsSummary,
  type AnalyzeResult,
  type CoverageMatrix,
  type LibraryStats,
  type PolicyRecord,
  type PortfolioScanResult,
  type RunHistoryResponse
} from "./lib/api";
import {
  buildActionRoadmap,
  buildClauseMix,
  buildGovernanceChecks,
  buildInsightCards,
  buildThemeSummary,
  policyTitleFromFileName,
  samplePreview
} from "./lib/workspace";

type Page = "workspace" | "report" | "governance" | "analytics" | "history" | "portfolio";

const emptyStats: LibraryStats = {
  regulation_documents: 0,
  regulation_clauses: 0,
  policy_documents: 0,
  vector_store_ready: false
};

const navItems: Array<{ id: Page; label: string }> = [
  { id: "workspace", label: "Workspace" },
  { id: "report", label: "Report" },
  { id: "governance", label: "Governance" },
  { id: "analytics", label: "Analytics" },
  { id: "history", label: "History" },
  { id: "portfolio", label: "Portfolio" }
];

function getPageFromHash(): Page {
  const raw = window.location.hash.replace("#", "").trim();
  if (["report", "governance", "analytics", "history", "portfolio"].includes(raw)) {
    return raw as Page;
  }
  return "workspace";
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getPageFromHash());
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("");
  const [workingTitle, setWorkingTitle] = useState("Working Policy Draft");
  const [policyText, setPolicyText] = useState("");
  const [stats, setStats] = useState<LibraryStats>(emptyStats);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null);
  const [portfolioResult, setPortfolioResult] = useState<PortfolioScanResult | null>(null);
  const [historyResult, setHistoryResult] = useState<RunHistoryResponse>({ items: [] });
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [coverageMatrix, setCoverageMatrix] = useState<CoverageMatrix | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [busyAction, setBusyAction] = useState<"analysis" | "portfolio" | "index" | null>(null);

  useEffect(() => {
    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    void Promise.all([fetchPolicies(), fetchStats(), fetchHistory(), fetchAnalyticsSummary(), fetchCoverageMatrix()])
      .then(([policyList, libraryStats, history, analytics, matrix]) => {
        setPolicies(policyList);
        setStats(libraryStats);
        setHistoryResult(history);
        setAnalyticsSummary(analytics);
        setCoverageMatrix(matrix);
        if (policyList.length > 0) {
          loadPolicy(policyList[0]);
        }
      })
      .catch((error: Error) => {
        setMessage(error.message);
      });
  }, []);

  async function refreshDerived() {
    const [history, analytics, matrix] = await Promise.all([
      fetchHistory(),
      fetchAnalyticsSummary(),
      fetchCoverageMatrix()
    ]);
    setHistoryResult(history);
    setAnalyticsSummary(analytics);
    setCoverageMatrix(matrix);
  }

  function navigate(nextPage: Page) {
    window.location.hash = nextPage === "workspace" ? "" : nextPage;
    setPage(nextPage);
  }

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
      await refreshDerived();
      setMessage(`Analysis complete for ${result.analysis.policy_name}.`);
      navigate("report");
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
      await refreshDerived();
      setMessage(`Portfolio scan completed across ${result.scanned_policies} policies.`);
      navigate("portfolio");
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
  const governanceChecks = analysis ? buildGovernanceChecks(policyText, analysis.findings) : [];
  const themeSummary = analysis ? buildThemeSummary(analysis.findings) : [];
  const clauseMix = analysis ? buildClauseMix(analysis.evidence) : [];

  return (
    <div className="shell app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Regulatory Compliance Intelligence</p>
          <h1>Compliance analytics platform with saved runs, governance signals, and portfolio intelligence.</h1>
          <p className="hero-text compact">
            This now behaves more like a data and analytics product: prepare policy data, run evidence-backed analysis,
            inspect reports, review governance checks, track run history, and compare coverage across policies.
          </p>
        </div>
        <div className="topbar-badges">
          <span><ShieldCheck size={16} /> Citation-locked evidence</span>
          <span><Database size={16} /> Persisted run history</span>
          <span><BarChart3 size={16} /> Analytics and governance views</span>
        </div>
      </header>

      <nav className="page-nav panel">
        <div className="nav-list">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-pill ${page === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="nav-actions">
          <button className="primary-button" onClick={handleAnalyze} disabled={busy}>
            {busyAction === "analysis" ? "Running analysis..." : "Run analysis"}
            <ArrowRight size={16} />
          </button>
          <button className="secondary-button" onClick={handlePortfolioScan} disabled={busy}>
            {busyAction === "portfolio" ? "Scanning portfolio..." : "Portfolio scan"}
          </button>
          <button className="ghost-button" onClick={handleIndexRebuild} disabled={busy}>
            <RefreshCw size={15} />
            {busyAction === "index" ? "Rebuilding index..." : "Rebuild index"}
          </button>
        </div>
      </nav>

      {message ? <div className="message-strip panel"><AlertCircle size={16} /><span>{message}</span></div> : null}
      {busyAction === "analysis" ? (
        <div className="info-strip panel"><Sparkles size={16} /><span>Analysis is running. The current fast-model path usually returns in roughly 10-15 seconds.</span></div>
      ) : null}

      {page === "workspace" ? (
        <main className="workspace-grid">
          <section className="panel sample-panel">
            <div className="section-heading compact-heading">
              <h2>Preloaded policy pack</h2>
              <p>Load a seeded policy into the working document, or upload a file, before running the analytics workflow.</p>
            </div>
            <div className="sample-list two-column-samples">
              {policies.map((policy) => (
                <button key={policy.id} className={`sample-card ${selectedPolicy === policy.id ? "active" : ""}`} onClick={() => loadPolicy(policy)} disabled={busy}>
                  <div>
                    <strong>{policy.title}</strong>
                    <p>{samplePreview(policy)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="workspace-stats">
              <MetricCard label="Regulation docs" value={stats.regulation_documents} note="Seeded legal packs" />
              <MetricCard label="Indexed clauses" value={stats.regulation_clauses} note="Deterministic evidence set" />
              <MetricCard label="Policy docs" value={stats.policy_documents} note="Ready-to-run examples" />
              <MetricCard label="Vector store" value={stats.vector_store_ready ? "Ready" : "Pending"} note="Local Chroma state" />
            </div>
          </section>

          <section className="panel editor-panel">
            <div className="section-heading compact-heading">
              <h2>Policy workspace</h2>
              <p>Use this as the working document canvas. The content here is the exact payload sent for analysis.</p>
            </div>
            <div className="editor-meta">
              <div>
                <label className="field-label" htmlFor="policy-title">Policy title</label>
                <input id="policy-title" className="field" value={workingTitle} onChange={(event) => setWorkingTitle(event.target.value)} disabled={busy} />
              </div>
              <div className="editor-tools">
                <label className="file-button">
                  <FileInput size={15} />
                  Load `.txt` or `.md`
                  <input type="file" accept=".txt,.md" onChange={handleFileLoad} />
                </label>
                <button className="ghost-button" onClick={() => setPolicyText("")} disabled={busy}>Clear editor</button>
              </div>
            </div>
            <label className="field-label" htmlFor="policy-text">Policy body</label>
            <textarea id="policy-text" className="textarea mega-textarea" value={policyText} onChange={(event) => setPolicyText(event.target.value)} />
          </section>
        </main>
      ) : null}

      {page === "report" ? (
        <main className="report-layout">
          {analysis && metrics ? (
            <>
              <section className="panel report-hero">
                <div className="report-copy">
                  <p className="eyebrow">Report</p>
                  <h2>{analysis.policy_name}</h2>
                  <p className="summary-copy">{analysis.executive_summary}</p>
                </div>
                <div className="report-scorecard">
                  <div><span className="metric-label">Score</span><strong className="score-value">{analysis.overall_score}</strong></div>
                  <div><span className="metric-label">Risk posture</span><strong className="score-value small">{analysis.risk_posture}</strong></div>
                  <button className="secondary-button" onClick={handleDownloadReport}><Download size={15} />Export markdown report</button>
                </div>
              </section>
              <section className="insight-grid">
                {insightCards.map((card) => (
                  <article className="panel insight-card" key={card.label}><span className="field-label">{card.label}</span><strong>{card.value}</strong><p>{card.note}</p></article>
                ))}
              </section>
              <section className="panel"><div className="section-heading compact-heading"><h2>Action roadmap</h2><p>Translate findings into execution steps instead of stopping at the generated summary.</p></div><div className="roadmap-grid">{actionRoadmap.map((action) => (<article className="roadmap-card" key={`${action.horizon}-${action.title}`}><span className="field-label">{action.horizon}</span><h3>{action.title}</h3><p>{action.note}</p><div className="citation-row compact-citations">{action.citations.map((citation) => (<code key={citation}>{citation}</code>))}</div></article>))}</div></section>
              <section className="panel"><div className="section-heading compact-heading"><h2>Score breakdown</h2><p>Use the scorecards to understand why the result landed where it did.</p></div><ScoreBreakdown metrics={metrics} /></section>
              <section className="panel"><div className="section-heading compact-heading"><h2>Findings</h2><p>Detailed gap analysis with clause-level support and recommended actions.</p></div><div className="finding-list">{analysis.findings.map((finding) => (<FindingCard key={finding.title} finding={finding} />))}</div></section>
              <section className="panel"><div className="section-heading compact-heading"><h2>Evidence pack</h2><p>Retrieved clauses that bounded the response and support auditability.</p></div><EvidenceTable evidence={analysis.evidence} /></section>
            </>
          ) : <section className="panel empty-panel"><h2>No report yet</h2><p>Run an analysis from the Workspace page and the report will open here as a separate view.</p></section>}
        </main>
      ) : null}

      {page === "governance" ? (
        <main className="governance-layout">
          {analysis ? (
            <>
              <section className="panel governance-hero"><div><p className="eyebrow">Governance and validation</p><h2>Deterministic checks around the same policy and evidence set.</h2><p className="summary-copy">This view adds data-quality, stewardship, and evidence-distribution checks so the project reads like an analytics workflow instead of just an LLM result page.</p></div></section>
              <section className="governance-grid">
                <section className="panel"><div className="section-heading compact-heading"><h2>Policy quality checks</h2><p>Rule-based checks over the policy text for ownership, cadence, retention, incident handling, and vendor controls.</p></div><div className="check-list">{governanceChecks.map((check) => (<div className="check-row" key={check.label}><div><strong>{check.label}</strong><p>{check.detail}</p></div><span className={`status-dot ${check.status}`}>{check.status}</span></div>))}</div></section>
                <section className="panel"><div className="section-heading compact-heading"><h2>Theme analysis</h2><p>Aggregated finding themes suitable for dashboarding and stakeholder reporting.</p></div><div className="theme-list">{themeSummary.map((theme) => (<div className="theme-row" key={theme.theme}><span>{theme.theme}</span><strong>{theme.count}</strong></div>))}</div></section>
                <section className="panel"><div className="section-heading compact-heading"><h2>Clause mix</h2><p>Distribution of cited evidence across the underlying regulatory corpus.</p></div><div className="clause-mix">{clauseMix.map((item) => (<div className="mix-row" key={item.label}><span>{item.label}</span><div className="mix-bar"><div style={{ width: `${item.share}%` }} /></div><strong>{item.count}</strong></div>))}</div></section>
              </section>
            </>
          ) : <section className="panel empty-panel"><h2>No governance view yet</h2><p>Run an analysis first, then this page will populate deterministic checks and evidence analytics.</p></section>}
        </main>
      ) : null}

      {page === "analytics" ? (
        <main className="analytics-layout">
          <section className="panel">
            <div className="section-heading compact-heading">
              <h2>Analytics summary</h2>
              <p>Persisted run history powers KPI summaries, clause frequency analysis, and cross-policy comparisons.</p>
            </div>
            {analyticsSummary ? (
              <>
                <div className="portfolio-metrics">
                  <MetricCard label="Total runs" value={analyticsSummary.total_runs} note="Saved analysis executions" />
                  <MetricCard label="Average score" value={analyticsSummary.average_score} note="Across persisted run history" />
                  <MetricCard label="Poor runs" value={analyticsSummary.poor_runs} note="Runs in high-risk posture" />
                  <MetricCard label="Watch runs" value={analyticsSummary.watch_runs} note="Runs needing follow-up" />
                </div>
                <div className="analytics-two-column">
                  <section className="panel nested-panel">
                    <div className="section-heading compact-heading">
                      <h2>Policy breakdown</h2>
                      <p>Average score and run count by policy.</p>
                    </div>
                    <div className="simple-list">
                      {analyticsSummary.policy_breakdown.map((item) => (
                        <div className="simple-row" key={item.policy_name}><strong>{item.policy_name}</strong><span>{item.runs} runs</span><span>{item.average_score}</span></div>
                      ))}
                    </div>
                  </section>
                  <section className="panel nested-panel">
                    <div className="section-heading compact-heading">
                      <h2>Top clauses</h2>
                      <p>Most frequently cited clauses across saved runs.</p>
                    </div>
                    <div className="simple-list">
                      {analyticsSummary.top_clauses.map((item) => (
                        <div className="simple-row" key={item.clause_id}><code>{item.clause_id}</code><span>{item.count}</span></div>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="analytics-two-column">
                  <section className="panel nested-panel">
                    <div className="section-heading compact-heading"><h2>Top gaps</h2><p>Repeated gap titles from persisted run history.</p></div>
                    <div className="simple-list">{analyticsSummary.top_gaps.map((item) => (<div className="simple-row" key={item.title}><strong>{item.title}</strong><span>{item.count}</span></div>))}</div>
                  </section>
                  <section className="panel nested-panel">
                    <div className="section-heading compact-heading"><h2>Score trend</h2><p>Recent saved runs for quick monitoring.</p></div>
                    <div className="simple-list">{analyticsSummary.score_trend.map((item) => (<div className="simple-row" key={`${item.created_at}-${item.policy_name}`}><strong>{item.policy_name}</strong><span>{item.overall_score}</span><span>{new Date(item.created_at).toLocaleString()}</span></div>))}</div>
                  </section>
                </div>
              </>
            ) : <div className="empty-state compact-empty"><div className="empty-state-copy"><BarChart3 size={18} /><p>Run analyses to build the analytics summary.</p></div></div>}
          </section>
          <section className="panel">
            <div className="section-heading compact-heading"><h2>Coverage matrix</h2><p>Binary matrix showing which clauses appear in the latest saved run for each policy.</p></div>
            {coverageMatrix && coverageMatrix.rows.length > 0 ? <CoverageMatrixTable matrix={coverageMatrix} /> : <div className="empty-state compact-empty"><div className="empty-state-copy"><TableProperties size={18} /><p>Run analyses to populate the coverage matrix.</p></div></div>}
          </section>
        </main>
      ) : null}

      {page === "history" ? (
        <main className="history-layout">
          <section className="panel">
            <div className="section-heading compact-heading">
              <h2>Run history</h2>
              <p>Saved run metadata makes the app useful for trend tracking, QA review, and export into external tools.</p>
            </div>
            <div className="history-actions">
              <a className="secondary-button" href={historyCsvUrl()} target="_blank" rel="noreferrer"><Download size={15} />Export CSV</a>
            </div>
            {historyResult.items.length > 0 ? <HistoryTable items={historyResult.items} /> : <div className="empty-state compact-empty"><div className="empty-state-copy"><History size={18} /><p>Run analyses to populate persisted run history.</p></div></div>}
          </section>
        </main>
      ) : null}

      {page === "portfolio" ? (
        <main className="portfolio-layout">
          <section className="panel">
            <div className="section-heading compact-heading"><h2>Portfolio overview</h2><p>Compare the seeded policy set and identify which document deserves attention first.</p></div>
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
            ) : <div className="empty-state compact-empty"><div className="empty-state-copy"><LayoutDashboard size={18} /><p>Run a portfolio scan to populate the cross-policy risk table.</p></div></div>}
          </section>
        </main>
      ) : null}
    </div>
  );
}
