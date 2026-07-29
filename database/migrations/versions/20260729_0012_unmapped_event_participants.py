"""Retain event participants without requiring a canonical player match.

Revision ID: 20260729_0012
Revises: 20260729_0011
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0012"
down_revision: str | Sequence[str] | None = "20260729_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add source identity and make canonical participant matching optional."""
    op.add_column(
        "game_event_players",
        sa.Column("source_player_id", sa.BigInteger(), nullable=True),
    )
    op.execute(
        """
        UPDATE game_event_players AS gep
        SET source_player_id = p.nhl_id
        FROM players AS p
        WHERE p.id = gep.player_id
        """
    )
    op.alter_column("game_event_players", "source_player_id", nullable=False)
    op.alter_column("game_event_players", "player_id", nullable=True)
    op.drop_constraint(
        "uq_game_event_players_event_player_role",
        "game_event_players",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_game_event_players_event_source_player_role",
        "game_event_players",
        ["game_event_id", "source_player_id", "role"],
    )


def downgrade() -> None:
    """Restore mandatory canonical participant matching when possible."""
    op.drop_constraint(
        "uq_game_event_players_event_source_player_role",
        "game_event_players",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_game_event_players_event_player_role",
        "game_event_players",
        ["game_event_id", "player_id", "role"],
    )
    op.alter_column("game_event_players", "player_id", nullable=False)
    op.drop_column("game_event_players", "source_player_id")
