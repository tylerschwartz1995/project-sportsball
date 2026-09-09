"""Migration configuration accepts percent-encoded hosted connection URLs."""

import os
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.parametrize(
    "database_url",
    [
        "postgresql+psycopg://owner:test%40password%25@localhost/sportsball",
        "postgresql+psycopg://owner:test@localhost/sportsball?sslmode=verify-full&sslrootcert=%2Fetc%2Fssl%2Fcert.pem",
    ],
)
def test_offline_migrations_accept_encoded_connection_urls(database_url: str) -> None:
    """Exercise the real Alembic environment without connecting to a database."""
    environment = {**os.environ, "SPORTSBALL_DATABASE_URL": database_url}
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "alembic",
            "--config",
            "database/alembic.ini",
            "upgrade",
            "20260906_0026:head",
            "--sql",
        ],
        cwd=Path(__file__).resolve().parents[2],
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE daily_work" in result.stdout
    assert "ALTER TABLE source_artifacts" in result.stdout
    assert database_url not in result.stdout + result.stderr
