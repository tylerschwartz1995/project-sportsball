"""Portable hosted job adapter: direct Neon TLS, no tunnels or migrations."""

import os
import subprocess
from pathlib import Path

from sqlalchemy.engine import make_url

from sportsball.operations.aws_jobs import backup

ROLES = {
    "ingestion": "sportsball_ingestion",
    "health": "sportsball_web",
    "backup": "sportsball_backup",
}


def database_environment(value: str, mode: str) -> dict[str, str]:
    url = make_url(value)
    if url.drivername not in ("postgresql", "postgresql+psycopg"):
        raise ValueError("expected PostgreSQL credentials")
    if not url.host or not url.host.endswith(".neon.tech") or "-pooler" in url.host:
        raise ValueError("hosted jobs require a direct Neon connection")
    if url.username != ROLES[mode] or not url.password or not url.database:
        raise ValueError("use the dedicated database role for this job")
    if url.port not in (None, 5432) or set(url.query) - {"sslmode", "channel_binding"}:
        raise ValueError("unsupported database connection options")
    # Bundled libpq/OpenSSL may not locate the host trust store with "system".
    roots = next(
        (
            str(path)
            for path in (Path("/etc/ssl/certs/ca-certificates.crt"), Path("/etc/ssl/cert.pem"))
            if path.is_file()
        ),
        None,
    )
    if roots is None:
        raise RuntimeError("operating system CA certificate bundle is unavailable")
    # Never accept a URL option that disables certificate verification.
    url = url.set(
        drivername="postgresql+psycopg", query={"sslmode": "verify-full", "sslrootcert": roots}
    )
    return {
        **os.environ,
        "SPORTSBALL_DATABASE_URL": url.render_as_string(hide_password=False),
        "PGHOST": url.host or "",
        "PGPORT": "5432",
        "PGDATABASE": url.database or "",
        "PGUSER": url.username or "",
        "PGPASSWORD": url.password or "",
        "PGSSLMODE": "verify-full",
        "PGSSLROOTCERT": roots,
        "PGCONNECT_TIMEOUT": "15",
    }


def pipeline(arguments: list[str], env: dict[str, str]) -> int:
    return subprocess.run(
        ["uv", "run", "--project", "pipeline", "--frozen", "--no-dev", "sportsball", *arguments],
        env=env,
        check=False,
    ).returncode


def run_job() -> int:
    if os.environ.get("HOSTED_JOBS_ENABLED") != "true":
        raise RuntimeError("hosted jobs remain disabled")
    mode = os.environ["JOB_MODE"]
    if mode not in ROLES:
        raise ValueError("unsupported hosted job")
    env = database_environment(os.environ["SPORTSBALL_DATABASE_URL"], mode)
    if mode in ("ingestion", "backup") and not os.environ.get("AWS_ROLE_CONFIGURED"):
        raise ValueError("S3 access must be configured")
    if mode == "backup" and not env.get("BACKUP_BUCKET"):
        raise ValueError("backup bucket is required")
    if mode == "ingestion":
        if not env.get("SPORTSBALL_ARTIFACT_S3_BUCKET"):
            raise ValueError("archive bucket is required")
        env["SPORTSBALL_ARTIFACT_BACKEND"] = "s3"
    if pipeline(["verify-database-schema"], env):
        return 1
    if mode == "backup":
        backup(env, retain_one=True)
        return 0
    if mode == "health":
        return pipeline(["check-data-health"], env)
    arguments = ["daily-update"]
    for key, option in (("INPUT_RUN_DATE", "--run-date"), ("INPUT_SEASON_ID", "--season-id")):
        if env.get(key):
            arguments.extend([option, env[key]])
    if env.get("INPUT_SKIP_MONEYPUCK") == "true":
        arguments.append("--skip-moneypuck")
    result = pipeline(arguments, env)
    health = pipeline(["check-data-health"], env)
    website = 0
    if env.get("SPORTSBALL_WEB_URL"):
        website = pipeline(["revalidate-website"], env)
    return 1 if result or health or website else 0
