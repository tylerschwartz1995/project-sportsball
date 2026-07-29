"""Preserve raw event clocks and tolerate malformed parsed values.

Revision ID: 20260729_0010
Revises: 20260729_0009
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0010"
down_revision: str | Sequence[str] | None = "20260729_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add exact source clocks and allow unavailable parsed seconds."""
    op.add_column(
        "game_events",
        sa.Column("time_in_period", sa.String(length=15), nullable=True),
    )
    op.add_column(
        "game_events",
        sa.Column("time_remaining", sa.String(length=15), nullable=True),
    )
    op.execute(
        """
        UPDATE game_events
        SET
            time_in_period =
                (time_in_period_seconds / 60)::text
                || ':'
                || lpad((time_in_period_seconds % 60)::text, 2, '0'),
            time_remaining =
                (time_remaining_seconds / 60)::text
                || ':'
                || lpad((time_remaining_seconds % 60)::text, 2, '0')
        """
    )
    op.alter_column("game_events", "time_in_period", nullable=False)
    op.alter_column("game_events", "time_remaining", nullable=False)
    op.alter_column("game_events", "time_in_period_seconds", nullable=True)
    op.alter_column("game_events", "time_remaining_seconds", nullable=True)


def downgrade() -> None:
    """Remove raw clocks when every parsed value remains representable."""
    op.alter_column("game_events", "time_remaining_seconds", nullable=False)
    op.alter_column("game_events", "time_in_period_seconds", nullable=False)
    op.drop_column("game_events", "time_remaining")
    op.drop_column("game_events", "time_in_period")
