import type { AnalysisMetrics, ComplianceAnalysis, EvidenceItem, GapFinding, PolicyRecord } from "./api";

type InsightCard = {
  label: string;
  value: string;
  note: string;
};

type ActionLane = {
  horizon: string;
  title: string;
  note: string;
  citations: string[];
};

type GovernanceCheck = {
  label: string;
  status: "pass" | "watch" | "fail";
  detail: string;
};

type ThemeCount = {
  theme: string;
  count: number;
};

type ClauseMixItem = {
  label: string;
  count: number;
  share: number;
};

const horizonBySeverity: Record<GapFinding["severity"], string> = {
  critical: "0-30 days",
  high: "0-30 days",
  medium: "30-60 days",
  low: "60-90 days"
};

const themeMatchers: Array<{ theme: string; pattern: RegExp }> = [
  { theme: "Retention", pattern: /retention|storage|erase|deletion/i },
  { theme: "Vendor risk", pattern: /vendor|processor|third-party|payroll/i },
  { theme: "Incident readiness", pattern: /breach|incident|notification/i },
  { theme: "Controls and approvals", pattern: /approval|review|journal|control/i },
  { theme: "Record keeping", pattern: /record|inventory|processing/i }
];

export function samplePreview(policy: PolicyRecord): string {
  const parts = policy.body
    .split("\n\n")
    .map((segment) => segment.trim())
    .filter((segment) => segment && !segment.startsWith("#"));
  return parts[0] ?? "Seeded policy ready for analysis.";
}

export function buildInsightCards(
  analysis: ComplianceAnalysis,
  metrics: AnalysisMetrics
): InsightCard[] {
  const topFinding = analysis.findings[0];
  return [
    {
      label: "Immediate priority",
      value: topFinding?.title ?? "No immediate risk",
      note: topFinding ? topFinding.remediation : "Run analysis to generate remediation guidance."
    },
    {
      label: "Control pressure",
      value: `${metrics.high_count + metrics.critical_count} elevated findings`,
      note: `${metrics.gap_count} gaps need action before the next review cycle.`
    },
    {
      label: "Evidence confidence",
      value: `${Math.round(metrics.evidence_coverage_ratio * 100)}% clause coverage`,
      note: `Average retrieval score ${metrics.average_evidence_score.toFixed(2)} across cited evidence.`
    },
    {
      label: "Operational stance",
      value: analysis.risk_posture,
      note: `Current score is ${analysis.overall_score}/100 with ${metrics.finding_count} findings in scope.`
    }
  ];
}

export function buildActionRoadmap(findings: GapFinding[]): ActionLane[] {
  return findings.slice(0, 3).map((finding) => ({
    horizon: horizonBySeverity[finding.severity],
    title: finding.title,
    note: finding.remediation,
    citations: finding.citation_ids
  }));
}

export function buildGovernanceChecks(policyText: string, findings: GapFinding[]): GovernanceCheck[] {
  const hasRetention = /retention|retain|storage limitation/i.test(policyText);
  const hasOwner = /owner|accountable|controller|team/i.test(policyText);
  const hasReviewCadence = /quarterly|monthly|annual|periodic|review/i.test(policyText);
  const hasIncidentTimeline = /breach|incident|notification|timeline/i.test(policyText);
  const hasVendorLanguage = /vendor|processor|third-party|supplier/i.test(policyText);
  const highRiskCount = findings.filter((finding) => ["critical", "high"].includes(finding.severity)).length;

  return [
    {
      label: "Ownership declared",
      status: hasOwner ? "pass" : "watch",
      detail: hasOwner ? "Policy references accountable functions or teams." : "Ownership and accountability are not explicit in the working policy text."
    },
    {
      label: "Retention language present",
      status: hasRetention ? "pass" : "fail",
      detail: hasRetention ? "Retention-related language exists and can be strengthened." : "No strong retention wording was found in the working policy text."
    },
    {
      label: "Review cadence documented",
      status: hasReviewCadence ? "pass" : "watch",
      detail: hasReviewCadence ? "A review cadence is referenced in the policy." : "No reliable review cadence or control-review interval was detected."
    },
    {
      label: "Incident workflow referenced",
      status: hasIncidentTimeline ? "pass" : "watch",
      detail: hasIncidentTimeline ? "Incident or breach handling appears in the policy text." : "No clear incident or notification timeline was found."
    },
    {
      label: "Vendor control language",
      status: hasVendorLanguage ? "pass" : "watch",
      detail: hasVendorLanguage ? "Third-party or processor language is present for review." : "Third-party control language is weak or absent in the current policy text."
    },
    {
      label: "High-risk load",
      status: highRiskCount >= 3 ? "fail" : highRiskCount >= 1 ? "watch" : "pass",
      detail: `${highRiskCount} elevated findings were generated for this policy.`
    }
  ];
}

export function buildThemeSummary(findings: GapFinding[]): ThemeCount[] {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    const match = themeMatchers.find((item) => item.pattern.test(`${finding.title} ${finding.rationale}`));
    const key = match?.theme ?? "General control gaps";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((left, right) => right.count - left.count);
}

export function buildClauseMix(evidence: EvidenceItem[]): ClauseMixItem[] {
  const counts = new Map<string, number>();
  for (const item of evidence) {
    const key = item.source_document.replace("_simulated.md", "").replace(/_/g, " ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = evidence.length || 1;
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, share: Math.round((count / total) * 100) }))
    .sort((left, right) => right.count - left.count);
}

export function policyTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
