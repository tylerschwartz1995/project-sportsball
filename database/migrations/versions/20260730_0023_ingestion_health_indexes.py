"""Index ingestion runs for operational health queries.

Revision ID: 20260730_0023
Revises: 20260730_0022
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260730_0023"
down_revision: str | Sequence[str] | None = "20260730_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add indexes used by freshness and stuck-run checks."""
    op.create_index(
        "ix_ingestion_runs_job_started_at",
        "ingestion_runs",
        ["job_name", "started_at"],
    )
    op.create_index(
        "ix_ingestion_runs_status_started_at",
        "ingestion_runs",
        ["status", "started_at"],
    )


def downgrade() -> None:
    """Remove operational ingestion-run indexes."""
    op.drop_index(
        "ix_ingestion_runs_status_started_at",
        table_name="ingestion_runs",
    )
    op.drop_index(
        "ix_ingestion_runs_job_started_at",
        table_name="ingestion_runs",
    )
