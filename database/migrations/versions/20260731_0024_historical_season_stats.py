"""Add NHL all-time season summary tables.

Revision ID: 20260731_0024
Revises: 20260730_0023
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0024"
down_revision: str | Sequence[str] | None = "20260730_0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create player and team season summaries spanning NHL history."""
    op.create_table(
        "historical_skater_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_abbrevs", sa.String(length=100), nullable=True),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("goals", sa.SmallInteger(), nullable=False),
        sa.Column("assists", sa.SmallInteger(), nullable=False),
        sa.Column("points", sa.SmallInteger(), nullable=False),
        sa.Column("penalty_minutes", sa.Integer(), nullable=True),
        sa.Column("plus_minus", sa.SmallInteger(), nullable=True),
        sa.Column("game_winning_goals", sa.SmallInteger(), nullable=True),
        sa.Column("power_play_goals", sa.SmallInteger(), nullable=True),
        sa.Column("power_play_points", sa.SmallInteger(), nullable=True),
        sa.Column("shorthanded_goals", sa.SmallInteger(), nullable=True),
        sa.Column("shorthanded_points", sa.SmallInteger(), nullable=True),
        sa.Column("shots", sa.Integer(), nullable=True),
        sa.Column("shooting_percentage", sa.Float(), nullable=True),
        sa.Column("time_on_ice_per_game_seconds", sa.Float(), nullable=True),
        sa.Column("faceoff_win_percentage", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_historical_skater_season_player",
        ),
    )
    _player_indexes("historical_skater_season_stats")

    op.create_table(
        "historical_goalie_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_abbrevs", sa.String(length=100), nullable=True),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("games_started", sa.SmallInteger(), nullable=True),
        sa.Column("wins", sa.SmallInteger(), nullable=False),
        sa.Column("losses", sa.SmallInteger(), nullable=False),
        sa.Column("ties", sa.SmallInteger(), nullable=True),
        sa.Column("overtime_losses", sa.SmallInteger(), nullable=True),
        sa.Column("goals_against", sa.Integer(), nullable=False),
        sa.Column("goals_against_average", sa.Float(), nullable=True),
        sa.Column("saves", sa.Integer(), nullable=True),
        sa.Column("shots_against", sa.Integer(), nullable=True),
        sa.Column("save_percentage", sa.Float(), nullable=True),
        sa.Column("shutouts", sa.SmallInteger(), nullable=False),
        sa.Column("time_on_ice_seconds", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_historical_goalie_season_player",
        ),
    )
    _player_indexes("historical_goalie_season_stats")

    op.create_table(
        "historical_team_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("nhl_team_id", sa.Integer(), nullable=False),
        sa.Column("team_name", sa.String(length=150), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("wins", sa.SmallInteger(), nullable=False),
        sa.Column("losses", sa.SmallInteger(), nullable=False),
        sa.Column("ties", sa.SmallInteger(), nullable=True),
        sa.Column("overtime_losses", sa.SmallInteger(), nullable=True),
        sa.Column("points", sa.SmallInteger(), nullable=False),
        sa.Column("point_percentage", sa.Float(), nullable=True),
        sa.Column("goals_for", sa.Integer(), nullable=False),
        sa.Column("goals_against", sa.Integer(), nullable=False),
        sa.Column("regulation_and_overtime_wins", sa.SmallInteger(), nullable=True),
        sa.Column("shots_for_per_game", sa.Float(), nullable=True),
        sa.Column("shots_against_per_game", sa.Float(), nullable=True),
        sa.Column("power_play_percentage", sa.Float(), nullable=True),
        sa.Column("penalty_kill_percentage", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "nhl_team_id",
            name="uq_historical_team_season_team",
        ),
    )
    op.create_index(
        "ix_historical_team_season_stats_season_id",
        "historical_team_season_stats",
        ["season_id"],
    )
    op.create_index(
        "ix_historical_team_season_stats_game_type",
        "historical_team_season_stats",
        ["game_type"],
    )
    op.create_index(
        "ix_historical_team_season_stats_nhl_team_id",
        "historical_team_season_stats",
        ["nhl_team_id"],
    )


def _player_indexes(table_name: str) -> None:
    op.create_index(f"ix_{table_name}_season_id", table_name, ["season_id"])
    op.create_index(f"ix_{table_name}_game_type", table_name, ["game_type"])
    op.create_index(f"ix_{table_name}_player_id", table_name, ["player_id"])


def downgrade() -> None:
    """Remove NHL all-time season summaries."""
    op.drop_table("historical_team_season_stats")
    op.drop_table("historical_goalie_season_stats")
    op.drop_table("historical_skater_season_stats")
