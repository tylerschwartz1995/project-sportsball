"""AWS job adapter. No domain logic or automatic schema changes live here."""

import hashlib
import json
import os
import re
import socket
import subprocess
import tempfile
import time
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

import boto3
from sqlalchemy.engine import make_url

DATABASE_PARAMETERS = {
    "ingestion": "ingestion-database-url",
    "health": "readonly-database-url",
    "backup": "backup-database-url",
}


def parameter(name: str) -> str:
    value = (
        boto3.client("ssm").get_parameter(Name=name, WithDecryption=True)["Parameter"].get("Value")
    )
    if value is None:
        raise ValueError("required parameter has no value")
    return value


def database_environment(value: str) -> dict[str, str]:
    """The database URI must point through our local tunnel, never the public server."""
    url = make_url(value)
    if url.drivername not in ("postgresql", "postgresql+psycopg"):
        raise ValueError("expected PostgreSQL credentials")
    if url.host != "127.0.0.1" or url.port != 55432 or url.database != "sportsball":
        raise ValueError("database credentials must use 127.0.0.1:55432/sportsball")
    if not url.username or not url.password:
        raise ValueError("database credentials are incomplete")
    return {
        **os.environ,
        "SPORTSBALL_DATABASE_URL": url.set(drivername="postgresql+psycopg").render_as_string(
            hide_password=False
        ),
        "PGHOST": "127.0.0.1",
        "PGPORT": "55432",
        "PGDATABASE": "sportsball",
        "PGUSER": url.username,
        "PGPASSWORD": url.password,
    }


@contextmanager
def database_tunnel(node: str, document: str) -> Iterator[None]:
    if not re.fullmatch(r"mi-[a-z0-9]+", node):
        raise ValueError("expected a registered Systems Manager hybrid node")
    # Fail rather than accidentally connect to a stale local listener.
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 55432))
    client = boto3.client("ssm")
    session = client.start_session(Target=node, DocumentName=document)
    region = client.meta.region_name
    process = None
    try:
        process = subprocess.Popen(
            [
                "session-manager-plugin",
                json.dumps(session),
                region,
                "StartSession",
                "",
                json.dumps({"Target": node}),
                f"https://ssm.{region}.amazonaws.com",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(60):
            if process.poll() is not None:
                raise RuntimeError("database tunnel exited before becoming ready")
            try:
                with socket.create_connection(("127.0.0.1", 55432), timeout=1):
                    break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError("database tunnel did not become ready")
        yield
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        client.terminate_session(SessionId=session["SessionId"])


def pipeline(command: str, env: dict[str, str]) -> int:
    return subprocess.run(
        ["uv", "run", "--project", "pipeline", "--frozen", "--no-dev", "sportsball", command],
        env=env,
        check=False,
    ).returncode


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
        # Timestamp + digest avoids overwriting a previous run or a retried backup.
        key = f"daily/{datetime.now(UTC):%Y/%m/%d/%H%M%S}-{digest}.dump"
        client = boto3.client("s3")
        client.upload_file(
            str(path), env["BACKUP_BUCKET"], key, ExtraArgs={"Metadata": {"sha256": digest}}
        )
        client.put_object(
            Bucket=env["BACKUP_BUCKET"], Key=f"{key}.sha256", Body=f"{digest}\n".encode()
        )
        print("logical backup uploaded with checksum; restore verification remains separate")


def run_job() -> int:
    mode = os.environ["JOB_MODE"]
    if mode not in DATABASE_PARAMETERS:
        raise ValueError("unsupported AWS job mode")
    prefix = os.environ["PARAMETER_PREFIX"].rstrip("/")
    # Check before fetching any database secret, opening a session, or doing work.
    if parameter(f"{prefix}/runtime/jobs-enabled") != "true":
        raise RuntimeError("AWS jobs remain disabled pending activation approval")
    node = parameter(f"{prefix}/runtime/managed-node-id")
    env = database_environment(parameter(f"{prefix}/secrets/{DATABASE_PARAMETERS[mode]}"))
    if mode == "ingestion":
        env["SPORTSBALL_ARTIFACT_BACKEND"] = "s3"
        env["SPORTSBALL_ARTIFACT_S3_BUCKET"] = os.environ["ARCHIVE_BUCKET"]
    with database_tunnel(node, os.environ["TUNNEL_DOCUMENT"]):
        if pipeline("verify-database-schema", env):
            return 1
        if mode == "backup":
            backup(env)
            return 0
        if mode == "health":
            return pipeline("check-data-health", env)
        result = pipeline("daily-update", env)
        health = pipeline("check-data-health", env)
        return 1 if result or health else 0
