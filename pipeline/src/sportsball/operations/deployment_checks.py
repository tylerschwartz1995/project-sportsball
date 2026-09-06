"""Read-only schema readiness and authenticated website cache invalidation."""

import os
from urllib.parse import urlparse

import httpx
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import select

from sportsball.persistence.database import engine, session_scope
from sportsball.persistence.models import IngestionRun


def verify_database_schema() -> None:
    """Daily automation checks schema compatibility; releases apply migrations."""
    config = Config("database/alembic.ini")
    required = set(ScriptDirectory.from_config(config).get_heads())
    with engine.connect() as connection:
        current = set(MigrationContext.configure(connection).get_current_heads())
    if current != required:
        raise ValueError(
            "database schema differs from this release; apply migrations before ingestion"
        )


def revalidate_website() -> None:
    """Only expire shared caches after a complete core publication."""
    base_url = os.environ.get("SPORTSBALL_WEB_URL", "").rstrip("/")
    token = os.environ.get("SPORTSBALL_REVALIDATION_TOKEN", "")
    parsed = urlparse(base_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("SPORTSBALL_WEB_URL must be an HTTPS website URL without credentials")
    if not token:
        raise ValueError("SPORTSBALL_REVALIDATION_TOKEN is required")
    with session_scope() as session:
        latest = session.scalar(
            select(IngestionRun)
            .where(
                IngestionRun.job_name == "daily_update",
            )
            .order_by(IngestionRun.started_at.desc())
            .limit(1)
        )
    if latest is None or latest.status not in ("succeeded", "degraded"):
        raise ValueError("the latest daily run has not completed core publication")
    with httpx.Client(timeout=30, follow_redirects=False) as client:
        response = client.post(
            f"{base_url}/api/ingestion/revalidate", headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
