import type { AnalysisMetrics, ComplianceAnalysis, GapFinding, PolicyRecord } from "./api";

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

const horizonBySeverity: Record<GapFinding["severity"], string> = {
  critical: "0-30 days",
  high: "0-30 days",
  medium: "30-60 days",
  low: "60-90 days"
};

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

export function policyTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
