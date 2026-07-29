"""Create durable per-game box-score backfill state.

Revision ID: 20260729_0006
Revises: 20260729_0005
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0006"
down_revision: str | Sequence[str] | None = "20260729_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create processing state and recognize box scores already ingested."""
    op.alter_column(
        "player_game_stats",
        "time_on_ice_seconds",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.create_table(
        "boxscore_backfill_games",
        sa.Column("game_id", sa.BigInteger(), autoincrement=False, nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.PrimaryKeyConstraint("game_id"),
    )
    op.execute(
        """
        INSERT INTO boxscore_backfill_games (
            game_id,
            status,
            attempt_count,
            error_message,
            completed_at
        )
        SELECT
            team_game_stats.game_id,
            'completed',
            0,
            NULL,
            now()
        FROM team_game_stats
        GROUP BY team_game_stats.game_id
        HAVING count(*) = 2
        ON CONFLICT (game_id) DO NOTHING
        """
    )


def downgrade() -> None:
    """Drop durable box-score backfill state."""
    op.drop_table("boxscore_backfill_games")
    op.execute(
        "UPDATE player_game_stats SET time_on_ice_seconds = 0 "
        "WHERE time_on_ice_seconds IS NULL"
    )
    op.alter_column(
        "player_game_stats",
        "time_on_ice_seconds",
        existing_type=sa.Integer(),
        nullable=False,
    )
