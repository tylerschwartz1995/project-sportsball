"""Durable daily ingestion work and discovery

Revision ID: 20260906_0027
Revises: 20260906_0026
Create Date: 2026-09-06 13:57:59.520647
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260906_0027"
down_revision: str | Sequence[str] | None = "20260906_0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply the migration."""
    op.create_table(
        "daily_schedule_checkpoints",
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("next_date", sa.Date(), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("covered_through", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(
            ["season_id"],
            ["seasons.id"],
        ),
        sa.PrimaryKeyConstraint("season_id"),
    )
    op.create_table(
        "daily_work",
        sa.Column("dataset", sa.String(length=80), nullable=False),
        sa.Column("source_key", sa.String(length=80), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.UUID(), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("coverage", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["ingestion_runs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["season_id"],
            ["seasons.id"],
        ),
        sa.PrimaryKeyConstraint("dataset", "source_key"),
    )
    op.create_index(
        op.f("ix_daily_work_season_id"), "daily_work", ["season_id"], unique=False
    )
    op.add_column(
        "ingestion_runs", sa.Column("parent_run_id", sa.UUID(), nullable=True)
    )
    op.create_index(
        op.f("ix_ingestion_runs_parent_run_id"),
        "ingestion_runs",
        ["parent_run_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_ingestion_runs_parent_run_id",
        "ingestion_runs",
        "ingestion_runs",
        ["parent_run_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Reverse the migration."""
    op.drop_constraint(
        "fk_ingestion_runs_parent_run_id", "ingestion_runs", type_="foreignkey"
    )
    op.drop_index(op.f("ix_ingestion_runs_parent_run_id"), table_name="ingestion_runs")
    op.drop_column("ingestion_runs", "parent_run_id")
    op.drop_index(op.f("ix_daily_work_season_id"), table_name="daily_work")
    op.drop_table("daily_work")
    op.drop_table("daily_schedule_checkpoints")
