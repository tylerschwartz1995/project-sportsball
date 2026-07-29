"""Create normalized play-by-play events and resumable backfill state.

Revision ID: 20260729_0009
Revises: 20260729_0008
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0009"
down_revision: str | Sequence[str] | None = "20260729_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create event facts, player roles, and durable backfill status."""
    op.create_table(
        "play_by_play_backfill_games",
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
    op.create_table(
        "game_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("source_event_id", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("period_number", sa.SmallInteger(), nullable=False),
        sa.Column("period_type", sa.String(length=10), nullable=False),
        sa.Column("time_in_period_seconds", sa.SmallInteger(), nullable=False),
        sa.Column("time_remaining_seconds", sa.SmallInteger(), nullable=False),
        sa.Column("situation_code", sa.String(length=10), nullable=True),
        sa.Column("home_team_defending_side", sa.String(length=10), nullable=True),
        sa.Column("type_code", sa.SmallInteger(), nullable=False),
        sa.Column("type_desc_key", sa.String(length=50), nullable=False),
        sa.Column("event_owner_team_id", sa.Integer(), nullable=True),
        sa.Column("x_coord", sa.SmallInteger(), nullable=True),
        sa.Column("y_coord", sa.SmallInteger(), nullable=True),
        sa.Column("zone_code", sa.String(length=5), nullable=True),
        sa.Column("shot_type", sa.String(length=30), nullable=True),
        sa.Column("reason", sa.String(length=100), nullable=True),
        sa.Column("secondary_reason", sa.String(length=100), nullable=True),
        sa.Column("penalty_type_code", sa.String(length=10), nullable=True),
        sa.Column("penalty_desc_key", sa.String(length=100), nullable=True),
        sa.Column("penalty_duration_minutes", sa.SmallInteger(), nullable=True),
        sa.Column("goal_in_game", sa.SmallInteger(), nullable=True),
        sa.Column("away_score", sa.SmallInteger(), nullable=True),
        sa.Column("home_score", sa.SmallInteger(), nullable=True),
        sa.Column("away_sog", sa.SmallInteger(), nullable=True),
        sa.Column("home_sog", sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(["event_owner_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id",
            "source_event_id",
            name="uq_game_events_game_source_event",
        ),
    )
    op.create_index(
        "ix_game_events_event_owner_team_id",
        "game_events",
        ["event_owner_team_id"],
    )
    op.create_index(
        "ix_game_events_type_desc_key",
        "game_events",
        ["type_desc_key"],
    )
    op.create_index(
        "ix_game_events_game_sort_order",
        "game_events",
        ["game_id", "sort_order"],
    )
    op.create_table(
        "game_event_players",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_event_id", sa.BigInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(
            ["game_event_id"],
            ["game_events.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_event_id",
            "player_id",
            "role",
            name="uq_game_event_players_event_player_role",
        ),
    )
    op.create_index(
        "ix_game_event_players_player_role",
        "game_event_players",
        ["player_id", "role"],
    )


def downgrade() -> None:
    """Drop play-by-play facts and backfill state."""
    op.drop_index(
        "ix_game_event_players_player_role",
        table_name="game_event_players",
    )
    op.drop_table("game_event_players")
    op.drop_index("ix_game_events_game_sort_order", table_name="game_events")
    op.drop_index("ix_game_events_type_desc_key", table_name="game_events")
    op.drop_index(
        "ix_game_events_event_owner_team_id",
        table_name="game_events",
    )
    op.drop_table("game_events")
    op.drop_table("play_by_play_backfill_games")
