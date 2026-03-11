from __future__ import annotations

import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import chromadb
import posthog
from chromadb.telemetry.product import posthog as chroma_posthog
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from app.core.config import get_settings


CLAUSE_PATTERN = re.compile(r"^##\s+([A-Z0-9\-]+)\s*$")
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")
posthog.disabled = True
chroma_posthog.posthog.disabled = True
chroma_posthog.posthog.capture = lambda *args, **kwargs: None


@dataclass
class RegulationChunk:
    clause_id: str
    source_document: str
    content: str


class ComplianceIndex:
    collection_name = "regulations"

    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.persist_directory = str(settings.vector_db_path)
        self.client_settings = chromadb.Settings(anonymized_telemetry=False)

    @property
    def embeddings(self) -> OpenAIEmbeddings:
        return OpenAIEmbeddings(
            model=self.settings.nebius_embedding_model,
            api_key=self.settings.nebius_api_key,
            base_url=self.settings.nebius_base_url,
            tiktoken_enabled=False,
            check_embedding_ctx_length=False,
        )

    def _parse_regulation_file(self, path: Path) -> list[RegulationChunk]:
        chunks: list[RegulationChunk] = []
        current_clause: str | None = None
        buffer: list[str] = []

        for raw_line in path.read_text(encoding="utf-8").splitlines():
            match = CLAUSE_PATTERN.match(raw_line.strip())
            if match:
                if current_clause and buffer:
                    chunks.append(
                        RegulationChunk(
                            clause_id=current_clause,
                            source_document=path.name,
                            content="\n".join(buffer).strip(),
                        )
                    )
                current_clause = match.group(1)
                buffer = []
                continue
            if current_clause:
                buffer.append(raw_line.strip())

        if current_clause and buffer:
            chunks.append(
                RegulationChunk(
                    clause_id=current_clause,
                    source_document=path.name,
                    content="\n".join(buffer).strip(),
                )
            )
        return chunks

    def build_documents(self, files: list[Path]) -> list[Document]:
        documents: list[Document] = []
        for path in files:
            for chunk in self._parse_regulation_file(path):
                documents.append(
                    Document(
                        page_content=chunk.content,
                        metadata={
                            "clause_id": chunk.clause_id,
                            "source_document": chunk.source_document,
                        },
                    )
                )
        return documents

    def rebuild(self, files: list[Path]) -> int:
        if self.settings.vector_db_path.exists():
            shutil.rmtree(self.settings.vector_db_path)
        self.settings.vector_db_path.mkdir(parents=True, exist_ok=True)
        documents = self.build_documents(files)
        if not documents:
            return 0
        Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            collection_name=self.collection_name,
            persist_directory=self.persist_directory,
            client_settings=self.client_settings,
        )
        return len(documents)

    def load(self) -> Chroma:
        return Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
            client_settings=self.client_settings,
        )

    def _client(self) -> chromadb.PersistentClient:
        return chromadb.PersistentClient(path=self.persist_directory, settings=self.client_settings)

    def fetch_all(self) -> list[dict[str, Any]]:
        collection = self._client().get_collection(self.collection_name)
        payload = collection.get(include=["embeddings", "documents", "metadatas"])
        rows: list[dict[str, Any]] = []
        for index, item_id in enumerate(payload["ids"]):
            rows.append(
                {
                    "id": item_id,
                    "embedding": payload["embeddings"][index],
                    "document": payload["documents"][index],
                    "metadata": payload["metadatas"][index],
                }
            )
        return rows

    def is_ready(self) -> bool:
        return self.settings.vector_db_path.exists() and any(self.settings.vector_db_path.iterdir())
