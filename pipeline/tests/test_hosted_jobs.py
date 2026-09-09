"""Hosted execution gates and direct TLS connections, without cloud services."""

import pytest

from sportsball.operations import hosted_jobs

URL = "postgresql://sportsball_ingestion:p%40ss@ep-example.us-west-2.aws.neon.tech/sportsball?sslmode=require"


def test_disabled_jobs_never_read_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HOSTED_JOBS_ENABLED", raising=False)
    monkeypatch.delenv("SPORTSBALL_DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="disabled"):
        hosted_jobs.run_job()


@pytest.mark.parametrize(
    "value",
    [
        URL.replace("ep-example", "ep-example-pooler"),
        URL.replace(".neon.tech", ".example.com"),
        URL.replace("sportsball_ingestion", "neondb_owner"),
        URL + "&host=localhost",
        URL.replace("p%40ss@", "@"),
    ],
)
def test_rejects_wrong_endpoint_or_role(value: str) -> None:
    with pytest.raises(ValueError):
        hosted_jobs.database_environment(value, "ingestion")


def test_direct_tls_preserves_encoded_password_and_enforces_trust() -> None:
    env = hosted_jobs.database_environment(URL.replace("require", "disable"), "ingestion")
    assert env["PGPASSWORD"] == "p@ss"
    assert "p%40ss" in env["SPORTSBALL_DATABASE_URL"]
    assert env["PGSSLROOTCERT"] == "system"
    assert env["PGSSLMODE"] == "verify-full"
    assert "sslmode=verify-full" in env["SPORTSBALL_DATABASE_URL"]


@pytest.mark.parametrize("daily_status", [0, 1])
def test_health_runs_after_ingestion_failure(
    monkeypatch: pytest.MonkeyPatch, daily_status: int
) -> None:
    calls: list[list[str]] = []
    for key, value in {
        "HOSTED_JOBS_ENABLED": "true",
        "JOB_MODE": "ingestion",
        "SPORTSBALL_DATABASE_URL": URL,
        "SPORTSBALL_ARTIFACT_S3_BUCKET": "test",
        "AWS_ROLE_CONFIGURED": "test",
        "SPORTSBALL_WEB_URL": "",
        "INPUT_RUN_DATE": "2026-09-08",
        "INPUT_SEASON_ID": "",
        "INPUT_SKIP_MONEYPUCK": "true",
    }.items():
        monkeypatch.setenv(key, value)

    def run(args: list[str], env: dict[str, str]) -> int:
        calls.append(args)
        assert env["SPORTSBALL_ARTIFACT_BACKEND"] == "s3"
        return daily_status if args[0] == "daily-update" else 0

    monkeypatch.setattr(hosted_jobs, "pipeline", run)
    assert hosted_jobs.run_job() == daily_status
    assert calls == [
        ["verify-database-schema"],
        ["daily-update", "--run-date", "2026-09-08", "--skip-moneypuck"],
        ["check-data-health"],
    ]


def test_schema_failure_prevents_ingestion(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HOSTED_JOBS_ENABLED", "true")
    monkeypatch.setenv("JOB_MODE", "ingestion")
    monkeypatch.setenv("SPORTSBALL_DATABASE_URL", URL)
    monkeypatch.setenv("SPORTSBALL_ARTIFACT_S3_BUCKET", "test")
    monkeypatch.setenv("AWS_ROLE_CONFIGURED", "test")
    calls: list[list[str]] = []

    def run(args: list[str], _env: dict[str, str]) -> int:
        calls.append(args)
        return 1

    monkeypatch.setattr(hosted_jobs, "pipeline", run)
    assert hosted_jobs.run_job() == 1
    assert calls == [["verify-database-schema"]]
