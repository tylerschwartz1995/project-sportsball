"""Add game outcomes and derived team standings fields.

Revision ID: 20260729_0008
Revises: 20260729_0007
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0008"
down_revision: str | Sequence[str] | None = "20260729_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TEAM_STANDINGS_COLUMNS = (
    "regulation_wins",
    "overtime_wins",
    "shootout_wins",
    "regulation_losses",
    "overtime_losses",
    "shootout_losses",
    "standings_points",
)


def upgrade() -> None:
    """Add nullable source outcomes and rebuildable standings metrics."""
    op.add_column(
        "games",
        sa.Column("last_period_type", sa.String(length=10), nullable=True),
    )
    op.create_check_constraint(
        "ck_games_last_period_type",
        "games",
        "last_period_type IS NULL OR last_period_type IN ('REG', 'OT', 'SO')",
    )
    for column in TEAM_STANDINGS_COLUMNS:
        op.add_column(
            "team_season_stats",
            sa.Column(
                column,
                sa.SmallInteger(),
                server_default=sa.text("0"),
                nullable=False,
            ),
        )
        op.alter_column("team_season_stats", column, server_default=None)


def downgrade() -> None:
    """Remove team standings metrics and canonical outcomes."""
    for column in reversed(TEAM_STANDINGS_COLUMNS):
        op.drop_column("team_season_stats", column)
    op.drop_constraint("ck_games_last_period_type", "games", type_="check")
    op.drop_column("games", "last_period_type")
