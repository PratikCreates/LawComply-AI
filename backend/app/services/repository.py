from pathlib import Path

from app.core.config import get_settings
from app.models.schemas import PolicyRecord


class DocumentRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.policy_dir = settings.data_dir / "policies"
        self.regulation_dir = settings.data_dir / "regulations"

    def list_policies(self) -> list[PolicyRecord]:
        records: list[PolicyRecord] = []
        for path in sorted(self.policy_dir.glob("*.md")):
            content = path.read_text(encoding="utf-8")
            title = content.splitlines()[0].lstrip("# ").strip()
            records.append(PolicyRecord(id=path.name, title=title, body=content))
        return records

    def get_policy(self, policy_id: str) -> PolicyRecord:
        path = self.policy_dir / policy_id
        if not path.exists():
            raise FileNotFoundError(f"Unknown policy '{policy_id}'.")
        content = path.read_text(encoding="utf-8")
        title = content.splitlines()[0].lstrip("# ").strip()
        return PolicyRecord(id=path.name, title=title, body=content)

    def list_regulation_files(self) -> list[Path]:
        return sorted(self.regulation_dir.glob("*.md"))

