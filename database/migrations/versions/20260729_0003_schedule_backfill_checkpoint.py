"""Create schedule backfill checkpoints.

Revision ID: 20260729_0003
Revises: 20260729_0002
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0003"
down_revision: str | Sequence[str] | None = "20260729_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the durable schedule backfill cursor."""
    op.alter_column("seasons", "id", server_default=None)
    op.execute("DROP SEQUENCE IF EXISTS seasons_id_seq")
    op.create_table(
        "schedule_backfill_checkpoints",
        sa.Column("season_id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("next_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("requests_completed", sa.Integer(), nullable=False),
        sa.Column("games_processed", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("season_id"),
    )


def downgrade() -> None:
    """Drop the schedule backfill cursor."""
    op.drop_table("schedule_backfill_checkpoints")
    op.execute("CREATE SEQUENCE IF NOT EXISTS seasons_id_seq OWNED BY seasons.id")
    op.alter_column(
        "seasons",
        "id",
        server_default=sa.text("nextval('seasons_id_seq'::regclass)"),
    )
