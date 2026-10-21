import hashlib
import subprocess
from pathlib import Path
from typing import Any

import pytest

from sportsball.operations import database_backup


@pytest.mark.parametrize("failure", [None, "pg_dump", "pg_restore"])
def test_only_hands_validated_dump_to_retention(
    monkeypatch: pytest.MonkeyPatch, failure: str | None
) -> None:
    payload = b"fixture PostgreSQL archive"
    uploaded: list[bytes] = []
    calls: list[str] = []
    client = object()
    env = {"BACKUP_BUCKET": "fixture-backups"}

    def run(args: list[str], **kwargs: Any) -> None:
        tool = Path(args[0]).name
        calls.append(tool)
        assert kwargs["check"] is True
        assert kwargs["env"] == env
        if tool == failure:
            raise subprocess.CalledProcessError(1, args)
        if tool == "pg_dump":
            Path(args[-1]).write_bytes(payload)

    def replace(s3: object, bucket: str, path: Path, digest: str) -> None:
        assert s3 is client
        assert bucket == "fixture-backups"
        assert digest == hashlib.sha256(payload).hexdigest()
        assert calls == ["pg_dump", "pg_restore"]
        uploaded.append(path.read_bytes())

    monkeypatch.setattr(database_backup.subprocess, "run", run)
    monkeypatch.setattr(database_backup.boto3, "client", lambda service: client)
    monkeypatch.setattr(database_backup, "replace_backup", replace)
    if failure:
        with pytest.raises(subprocess.CalledProcessError):
            database_backup.backup(env)
        assert uploaded == []
    else:
        database_backup.backup(env)
        assert uploaded == [payload]
