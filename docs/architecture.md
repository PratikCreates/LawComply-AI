# Architecture

## Flow

1. Regulations are loaded from `data/regulations`.
2. Each clause is normalized into a deterministic chunk with metadata.
3. Chunks are embedded through Nebius and persisted in Chroma.
4. A policy is selected or pasted into the UI.
5. The backend retrieves relevant clauses, assembles an evidence pack, and prompts the model to produce a structured compliance report.
6. The citation guard validates every cited clause before the response is returned.

## Main backend services

- `DocumentRepository`: loads policies and regulations from disk
- `ComplianceIndex`: chunking and vector persistence
- `RetrievalService`: similarity search and evidence packaging
- `ComplianceAgent`: orchestrates retrieval, policy scoring, and citation-locked synthesis
- `CitationGuard`: rejects unsupported or mutated citations

## Design decisions

- Regulations are stored as markdown with explicit clause labels. This keeps the demo auditable and simple to extend.
- Chroma is used locally because it is lightweight, reproducible, and good enough for a GitHub-ready showcase.
- Nebius is accessed through the OpenAI-compatible SDK layer so the model provider can be swapped later.
- The frontend is intentionally restrained and enterprise-oriented rather than using generic AI product styling.

