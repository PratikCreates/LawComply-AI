export type PolicyRecord = {
  id: string;
  title: string;
  body: string;
};

export type EvidenceItem = {
  clause_id: string;
  source_document: string;
  excerpt: string;
  score: number;
};

export type GapFinding = {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "gap" | "partial" | "aligned";
  rationale: string;
  remediation: string;
  citation_ids: string[];
};

export type ComplianceAnalysis = {
  policy_name: string;
  executive_summary: string;
  overall_score: number;
  risk_posture: "poor" | "watch" | "adequate" | "strong";
  findings: GapFinding[];
  evidence: EvidenceItem[];
};

export type AnalysisMetrics = {
  finding_count: number;
  gap_count: number;
  partial_count: number;
  aligned_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  cited_clause_count: number;
  evidence_coverage_ratio: number;
  average_evidence_score: number;
};

export type AnalyzeResult = {
  analysis: ComplianceAnalysis;
  metrics: AnalysisMetrics;
  report_markdown: string;
};

export type PortfolioPolicySummary = {
  policy_id: string;
  policy_name: string;
  overall_score: number;
  risk_posture: "poor" | "watch" | "adequate" | "strong";
  finding_count: number;
  critical_count: number;
  cited_clause_count: number;
  top_gaps: string[];
};

export type PortfolioScanResult = {
  scanned_policies: number;
  average_score: number;
  highest_risk_policy: string;
  lowest_score_policy: string;
  summaries: PortfolioPolicySummary[];
};

export type LibraryStats = {
  regulation_documents: number;
  regulation_clauses: number;
  policy_documents: number;
  vector_store_ready: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(payload.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export function fetchPolicies(): Promise<PolicyRecord[]> {
  return readJson("/api/v1/policies");
}

export function fetchStats(): Promise<LibraryStats> {
  return readJson("/api/v1/library/stats");
}

export async function rebuildIndex(): Promise<number> {
  const payload = await readJson<{ indexed_clauses: number }>("/api/v1/index/rebuild", {
    method: "POST"
  });
  return payload.indexed_clauses;
}

export async function analyzePolicy(input: {
  policy_id?: string;
  policy_text?: string;
  top_k?: number;
}): Promise<AnalyzeResult> {
  return readJson<AnalyzeResult>("/api/v1/analyze", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function portfolioScan(input?: {
  policy_ids?: string[];
  top_k?: number;
}): Promise<PortfolioScanResult> {
  return readJson<PortfolioScanResult>("/api/v1/portfolio/scan", {
    method: "POST",
    body: JSON.stringify(input ?? {})
  });
}
