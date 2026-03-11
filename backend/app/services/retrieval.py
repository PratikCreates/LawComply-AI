import math
import re
from typing import Literal

import numpy as np

from app.models.schemas import EvidenceItem
from app.services.vector_store import ComplianceIndex


RetrievalStrategy = Literal["semantic", "hybrid"]
TOKEN_PATTERN = re.compile(r"[a-z0-9]{3,}")
PRIVACY_TERMS = {
    "breach",
    "consent",
    "controller",
    "data",
    "deletion",
    "erasure",
    "inventory",
    "personal",
    "privacy",
    "processing",
    "processor",
    "records",
    "retention",
    "subject",
    "vendor",
}
FINANCE_TERMS = {
    "accounting",
    "audit",
    "filing",
    "journal",
    "payroll",
    "reconciliation",
    "revenue",
    "statutory",
    "tax",
    "vendor",
}


def tokenize(text: str) -> set[str]:
    return set(TOKEN_PATTERN.findall(text.lower()))


def infer_domain(text: str) -> str | None:
    tokens = tokenize(text)
    privacy_hits = len(tokens & PRIVACY_TERMS)
    finance_hits = len(tokens & FINANCE_TERMS)
    if privacy_hits == finance_hits == 0:
        return None
    return "privacy" if privacy_hits >= finance_hits else "finance"


def source_domain(source_document: str) -> str:
    return "privacy" if "gdpr" in source_document.lower() else "finance"


def lexical_overlap_score(query: str, document: str) -> float:
    query_tokens = tokenize(query)
    document_tokens = tokenize(document)
    if not query_tokens or not document_tokens:
        return 0.0
    overlap = len(query_tokens & document_tokens)
    return overlap / math.sqrt(len(query_tokens) * len(document_tokens))


def combine_scores(
    *,
    semantic_score: float,
    lexical_score: float,
    query_domain: str | None,
    candidate_domain: str,
    strategy: RetrievalStrategy,
) -> float:
    semantic_component = (semantic_score + 1.0) / 2.0
    if strategy == "semantic":
        return semantic_component
    domain_bonus = 0.08 if query_domain and query_domain == candidate_domain else 0.0
    return (semantic_component * 0.72) + (lexical_score * 0.2) + domain_bonus


class RetrievalService:
    def __init__(self, index: ComplianceIndex) -> None:
        self.index = index

    def retrieve_evidence(self, query: str, top_k: int, strategy: RetrievalStrategy = "hybrid") -> list[EvidenceItem]:
        query_embedding = np.array(self.index.embeddings.embed_query(query), dtype=float)
        candidates = self.index.fetch_all()
        if not candidates:
            return []
        scored: list[tuple[dict, float]] = []
        query_norm = np.linalg.norm(query_embedding) or 1.0
        query_domain = infer_domain(query)
        for candidate in candidates:
            embedding = np.array(candidate["embedding"], dtype=float)
            semantic_score = float(
                np.dot(query_embedding, embedding) / ((np.linalg.norm(embedding) or 1.0) * query_norm)
            )
            lexical_score = lexical_overlap_score(query, candidate["document"])
            score = combine_scores(
                semantic_score=semantic_score,
                lexical_score=lexical_score,
                query_domain=query_domain,
                candidate_domain=source_domain(candidate["metadata"]["source_document"]),
                strategy=strategy,
            )
            scored.append((candidate, score))
        scored.sort(key=lambda row: row[1], reverse=True)

        evidence: list[EvidenceItem] = []
        seen: set[str] = set()
        for candidate, score in scored[:top_k]:
            metadata = candidate["metadata"]
            clause_id = metadata["clause_id"]
            if clause_id in seen:
                continue
            seen.add(clause_id)
            evidence.append(
                EvidenceItem(
                    clause_id=clause_id,
                    source_document=metadata["source_document"],
                    excerpt=candidate["document"],
                    score=round(float(score), 4),
                )
            )
        return evidence
