"""Use stable MoneyPuck shot IDs for uniqueness.

Revision ID: 20260730_0019
Revises: 20260729_0018
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260730_0019"
down_revision: str | Sequence[str] | None = "20260729_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Replace the historically reused event-index key."""
    op.drop_constraint(
        "uq_moneypuck_shots_game_event", "moneypuck_shots", type_="unique"
    )
    op.create_unique_constraint(
        "uq_moneypuck_shots_game_shot",
        "moneypuck_shots",
        ["game_id", "source_shot_id"],
    )


def downgrade() -> None:
    """Clear reloadable facts and restore the event-index constraint."""
    op.execute("TRUNCATE TABLE moneypuck_shots")
    op.drop_constraint(
        "uq_moneypuck_shots_game_shot", "moneypuck_shots", type_="unique"
    )
    op.create_unique_constraint(
        "uq_moneypuck_shots_game_event",
        "moneypuck_shots",
        ["game_id", "source_event_index"],
    )
