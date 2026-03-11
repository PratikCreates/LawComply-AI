import numpy as np

from app.models.schemas import EvidenceItem
from app.services.vector_store import ComplianceIndex


class RetrievalService:
    def __init__(self, index: ComplianceIndex) -> None:
        self.index = index

    def retrieve_evidence(self, query: str, top_k: int) -> list[EvidenceItem]:
        query_embedding = np.array(self.index.embeddings.embed_query(query), dtype=float)
        candidates = self.index.fetch_all()
        if not candidates:
            return []
        scored: list[tuple[dict, float]] = []
        query_norm = np.linalg.norm(query_embedding) or 1.0
        for candidate in candidates:
            embedding = np.array(candidate["embedding"], dtype=float)
            score = float(np.dot(query_embedding, embedding) / ((np.linalg.norm(embedding) or 1.0) * query_norm))
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
