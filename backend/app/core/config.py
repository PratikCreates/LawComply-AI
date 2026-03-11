from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "LawComply AI"
    nebius_api_key: str = Field(default="", alias="NEBIUS_API_KEY")
    nebius_base_url: str = Field(
        default="https://api.tokenfactory.nebius.com/v1/",
        alias="NEBIUS_BASE_URL",
    )
    nebius_chat_model: str = Field(
        default="meta-llama/Meta-Llama-3.1-8B-Instruct-fast",
        alias="NEBIUS_CHAT_MODEL",
    )
    nebius_embedding_model: str = Field(
        default="BAAI/bge-en-icl",
        alias="NEBIUS_EMBEDDING_MODEL",
    )
    vector_db_dir: str = Field(default="backend/.chroma", alias="VECTOR_DB_DIR")
    cors_origins_raw: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")
    cors_origin_regex: str = Field(
        default=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        alias="CORS_ORIGIN_REGEX",
    )
    retrieval_k: int = 8
    retrieval_fetch_k: int = 20

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    @property
    def vector_db_path(self) -> Path:
        return ROOT_DIR / self.vector_db_dir

    @property
    def data_dir(self) -> Path:
        return ROOT_DIR / "data"


@lru_cache
def get_settings() -> Settings:
    return Settings()
