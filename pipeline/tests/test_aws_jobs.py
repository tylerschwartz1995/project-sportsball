"""Job gates, secret boundaries, and health checks use no live AWS services."""

from collections.abc import Iterator
from contextlib import contextmanager

import pytest

from sportsball.operations import aws_jobs


def test_disabled_job_reads_no_credentials_or_database(monkeypatch: pytest.MonkeyPatch) -> None:
    requested: list[str] = []

    def disabled(name: str) -> str:
        requested.append(name)
        return "false"

    monkeypatch.setenv("JOB_MODE", "ingestion")
    monkeypatch.setenv("PARAMETER_PREFIX", "/sportsball")
    monkeypatch.setattr(aws_jobs, "parameter", disabled)
    with pytest.raises(RuntimeError, match="disabled"):
        aws_jobs.run_job()
    assert requested == ["/sportsball/runtime/jobs-enabled"]


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://u:p@example.com:55432/sportsball",
        "postgresql://u:p@127.0.0.1:5432/sportsball",
        "postgresql://u:p@127.0.0.1:55432/other",
        "postgresql://u@127.0.0.1:55432/sportsball",
    ],
)
def test_rejects_credentials_outside_tunnel(url: str) -> None:
    with pytest.raises(ValueError):
        aws_jobs.database_environment(url)


def test_password_is_passed_via_environment_with_uri_escaping() -> None:
    env = aws_jobs.database_environment("postgresql://user:p%40ss@127.0.0.1:55432/sportsball")
    assert env["PGPASSWORD"] == "p@ss"
    assert "p%40ss" in env["SPORTSBALL_DATABASE_URL"]


@pytest.mark.parametrize("daily_status", [0, 1])
def test_health_runs_even_after_ingestion_failure(
    monkeypatch: pytest.MonkeyPatch, daily_status: int
) -> None:
    commands: list[str] = []
    parameters = {
        "/sportsball/runtime/jobs-enabled": "true",
        "/sportsball/runtime/managed-node-id": "mi-test",
        "/sportsball/secrets/ingestion-database-url": "postgresql://u:p@127.0.0.1:55432/sportsball",
    }

    @contextmanager
    def tunnel(_node: str, _document: str) -> Iterator[None]:
        yield

    def pipeline(command: str, env: dict[str, str]) -> int:
        commands.append(command)
        assert env["SPORTSBALL_ARTIFACT_BACKEND"] == "s3"
        return daily_status if command == "daily-update" else 0

    monkeypatch.setenv("JOB_MODE", "ingestion")
    monkeypatch.setenv("PARAMETER_PREFIX", "/sportsball")
    monkeypatch.setenv("TUNNEL_DOCUMENT", "test")
    monkeypatch.setenv("ARCHIVE_BUCKET", "test")
    monkeypatch.setattr(aws_jobs, "parameter", parameters.__getitem__)
    monkeypatch.setattr(aws_jobs, "database_tunnel", tunnel)
    monkeypatch.setattr(aws_jobs, "pipeline", pipeline)
    assert aws_jobs.run_job() == daily_status
    assert commands == ["verify-database-schema", "daily-update", "check-data-health"]
