"""Include unit type in MoneyPuck line uniqueness.

Revision ID: 20260730_0021
Revises: 20260730_0020
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260730_0021"
down_revision: str | Sequence[str] | None = "20260730_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Distinguish a two-ID forward line from the matching pairing key."""
    op.drop_constraint(
        "uq_moneypuck_line_game_team_unit",
        "moneypuck_line_game_stats",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_moneypuck_line_game_team_unit",
        "moneypuck_line_game_stats",
        ["game_id", "team_id", "source_line_id", "unit_type"],
    )


def downgrade() -> None:
    """Restore the original unit key after clearing reloadable facts."""
    op.execute("TRUNCATE TABLE moneypuck_line_game_stats")
    op.drop_constraint(
        "uq_moneypuck_line_game_team_unit",
        "moneypuck_line_game_stats",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_moneypuck_line_game_team_unit",
        "moneypuck_line_game_stats",
        ["game_id", "team_id", "source_line_id"],
    )
