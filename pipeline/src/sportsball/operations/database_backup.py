"""Portable PostgreSQL backups for the hosted job runner."""

import hashlib
import subprocess
import tempfile
from pathlib import Path

import boto3

from sportsball.operations.backup_retention import replace_backup


def backup(env: dict[str, str]) -> None:
    """Produce a portable PG18 archive. Restoration is a separate release gate."""
    with tempfile.TemporaryDirectory(prefix="sportsball-backup-") as directory:
        path = Path(directory) / "sportsball.dump"
        subprocess.run(
            [
                "/usr/lib/postgresql/18/bin/pg_dump",
                "--format=custom",
                "--no-owner",
                "--no-acl",
                "--file",
                str(path),
            ],
            env=env,
            check=True,
        )
        subprocess.run(
            [
                "/usr/lib/postgresql/18/bin/pg_restore",
                "--list",
                str(path),
            ],
            stdout=subprocess.DEVNULL,
            env=env,
            check=True,
        )
        with path.open("rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        replace_backup(boto3.client("s3"), env["BACKUP_BUCKET"], path, digest)
