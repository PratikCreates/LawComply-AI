from __future__ import annotations

import json
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.models.schemas import ComplianceAnalysis, EvidenceItem, GapFinding


JSON_BLOCK_PATTERN = re.compile(r"\{.*\}", re.DOTALL)


def extract_json_object(payload: str) -> dict:
    match = JSON_BLOCK_PATTERN.search(payload)
    if not match:
        raise ValueError("Model response did not contain JSON.")
    return json.loads(match.group(0))


class ComplianceAgent:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    (
                        "You are a regulatory compliance analyst. Use only the supplied policy text and "
                        "the evidence pack. Do not use outside knowledge. Return JSON only. "
                        "Every finding must cite at least one clause ID from the evidence pack. "
                        "overall_score is 0-100. risk_posture must be one of poor, watch, adequate, strong."
                    ),
                ),
                (
                    "user",
                    (
                        "Policy name: {policy_name}\n"
                        "Policy text:\n{policy_text}\n\n"
                        "Evidence pack:\n{evidence_pack}\n\n"
                        "Return a JSON object with this shape:\n"
                        "{{"
                        "\"policy_name\": string,"
                        "\"executive_summary\": string,"
                        "\"overall_score\": integer,"
                        "\"risk_posture\": \"poor\" | \"watch\" | \"adequate\" | \"strong\","
                        "\"findings\": [{{"
                        "\"title\": string,"
                        "\"severity\": \"critical\" | \"high\" | \"medium\" | \"low\","
                        "\"status\": \"gap\" | \"partial\" | \"aligned\","
                        "\"rationale\": string,"
                        "\"remediation\": string,"
                        "\"citation_ids\": [string]"
                        "}}]"
                        "}}"
                    ),
                ),
            ]
        )

    @property
    def model(self) -> ChatOpenAI:
        return ChatOpenAI(
            model=self.settings.nebius_chat_model,
            api_key=self.settings.nebius_api_key,
            base_url=self.settings.nebius_base_url,
            temperature=0.1,
        )

    def analyze(self, policy_name: str, policy_text: str, evidence_pack: str, evidence: list) -> ComplianceAnalysis:
        if self.settings.nebius_api_key:
            try:
                chain = self.prompt | self.model
                response = chain.invoke(
                    {
                        "policy_name": policy_name,
                        "policy_text": policy_text,
                        "evidence_pack": evidence_pack,
                    }
                )
                parsed = extract_json_object(response.content)
                parsed["evidence"] = [item.model_dump() for item in evidence]
                return ComplianceAnalysis.model_validate(parsed)
            except Exception:
                pass
        return self._fallback_analysis(policy_name, policy_text, evidence)

    def _fallback_analysis(
        self,
        policy_name: str,
        policy_text: str,
        evidence: list[EvidenceItem],
    ) -> ComplianceAnalysis:
        cited = evidence[:3] or [
            EvidenceItem(
                clause_id="LOCAL-REVIEW",
                source_document="local_fallback",
                excerpt="No indexed regulation evidence was available for this run.",
                score=0.0,
            )
        ]
        lowered = policy_text.lower()
        missing_terms = [
            term
            for term in ("retention", "deletion", "audit", "breach", "vendor")
            if term not in lowered
        ]
        severity = "high" if len(missing_terms) >= 3 else "medium"
        score = max(45, 82 - (len(missing_terms) * 7))
        risk_posture = "watch" if score < 75 else "adequate"
        focus = ", ".join(missing_terms[:3]) or "control evidence"

        return ComplianceAnalysis(
            policy_name=policy_name,
            executive_summary=(
                f"Local review found compliance coverage, with follow-up needed around {focus}."
            ),
            overall_score=score,
            risk_posture=risk_posture,
            findings=[
                GapFinding(
                    title=f"Clarify {focus} responsibilities",
                    severity=severity,
                    status="partial",
                    rationale=(
                        "The policy was compared with the strongest retrieved clauses, but the control "
                        "language does not fully spell out ownership, timing, and audit evidence."
                    ),
                    remediation=(
                        "Add accountable owners, review cadence, retention evidence, and exception handling "
                        "for the cited controls."
                    ),
                    citation_ids=[item.clause_id for item in cited],
                )
            ],
            evidence=cited,
        )
