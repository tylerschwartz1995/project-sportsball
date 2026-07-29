"""Add NHL-published player season team splits.

Revision ID: 20260729_0014
Revises: 20260729_0013
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0014"
down_revision: str | Sequence[str] | None = "20260729_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create official skater and goalie season split tables."""
    op.create_table(
        "official_skater_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("sequence", sa.SmallInteger(), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("goals", sa.SmallInteger(), nullable=True),
        sa.Column("assists", sa.SmallInteger(), nullable=True),
        sa.Column("points", sa.SmallInteger(), nullable=True),
        sa.Column("penalty_minutes", sa.Integer(), nullable=True),
        sa.Column("plus_minus", sa.SmallInteger(), nullable=True),
        sa.Column("average_time_on_ice", sa.String(length=10), nullable=True),
        sa.Column("average_time_on_ice_seconds", sa.Integer(), nullable=True),
        sa.Column("faceoff_win_percentage", sa.Float(), nullable=True),
        sa.Column("game_winning_goals", sa.SmallInteger(), nullable=True),
        sa.Column("overtime_goals", sa.SmallInteger(), nullable=True),
        sa.Column("power_play_goals", sa.SmallInteger(), nullable=True),
        sa.Column("power_play_points", sa.SmallInteger(), nullable=True),
        sa.Column("shorthanded_goals", sa.SmallInteger(), nullable=True),
        sa.Column("shorthanded_points", sa.SmallInteger(), nullable=True),
        sa.Column("shots", sa.Integer(), nullable=True),
        sa.Column("shooting_percentage", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            "sequence",
            name="uq_official_skater_season_player_sequence",
        ),
    )
    _indexes("official_skater_season_stats")
    op.create_table(
        "official_goalie_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("sequence", sa.SmallInteger(), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("games_started", sa.SmallInteger(), nullable=True),
        sa.Column("wins", sa.SmallInteger(), nullable=True),
        sa.Column("losses", sa.SmallInteger(), nullable=True),
        sa.Column("ties", sa.SmallInteger(), nullable=True),
        sa.Column("overtime_losses", sa.SmallInteger(), nullable=True),
        sa.Column("goals", sa.SmallInteger(), nullable=True),
        sa.Column("assists", sa.SmallInteger(), nullable=True),
        sa.Column("points", sa.SmallInteger(), nullable=True),
        sa.Column("penalty_minutes", sa.Integer(), nullable=True),
        sa.Column("time_on_ice", sa.String(length=15), nullable=True),
        sa.Column("time_on_ice_seconds", sa.Integer(), nullable=True),
        sa.Column("goals_against", sa.Integer(), nullable=True),
        sa.Column("goals_against_average", sa.Float(), nullable=True),
        sa.Column("shots_against", sa.Integer(), nullable=True),
        sa.Column("save_percentage", sa.Float(), nullable=True),
        sa.Column("shutouts", sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            "sequence",
            name="uq_official_goalie_season_player_sequence",
        ),
    )
    _indexes("official_goalie_season_stats")


def _indexes(table_name: str) -> None:
    op.create_index(f"ix_{table_name}_season_id", table_name, ["season_id"])
    op.create_index(f"ix_{table_name}_game_type", table_name, ["game_type"])
    op.create_index(f"ix_{table_name}_player_id", table_name, ["player_id"])
    op.create_index(f"ix_{table_name}_team_id", table_name, ["team_id"])


def downgrade() -> None:
    """Remove official player season split tables."""
    op.drop_table("official_goalie_season_stats")
    op.drop_table("official_skater_season_stats")
