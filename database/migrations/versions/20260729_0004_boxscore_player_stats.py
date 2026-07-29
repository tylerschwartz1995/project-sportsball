"""Create box-score player and team statistics.

Revision ID: 20260729_0004
Revises: 20260729_0003
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0004"
down_revision: str | Sequence[str] | None = "20260729_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create canonical players and traditional box-score statistics."""
    op.create_table(
        "players",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nhl_id", sa.BigInteger(), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("position", sa.String(length=10), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_players_nhl_id", "players", ["nhl_id"], unique=True)

    op.create_table(
        "team_game_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("is_home", sa.Boolean(), nullable=False),
        sa.Column("score", sa.SmallInteger(), nullable=False),
        sa.Column("shots_on_goal", sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("game_id", "team_id", name="uq_team_game_stats_game_team"),
    )
    op.create_index("ix_team_game_stats_game_id", "team_game_stats", ["game_id"])
    op.create_index("ix_team_game_stats_team_id", "team_game_stats", ["team_id"])

    op.create_table(
        "player_game_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("sweater_number", sa.SmallInteger(), nullable=True),
        sa.Column("position", sa.String(length=10), nullable=False),
        sa.Column("goals", sa.SmallInteger(), nullable=False),
        sa.Column("assists", sa.SmallInteger(), nullable=False),
        sa.Column("points", sa.SmallInteger(), nullable=False),
        sa.Column("plus_minus", sa.SmallInteger(), nullable=False),
        sa.Column("penalty_minutes", sa.SmallInteger(), nullable=False),
        sa.Column("hits", sa.SmallInteger(), nullable=False),
        sa.Column("power_play_goals", sa.SmallInteger(), nullable=False),
        sa.Column("shots_on_goal", sa.SmallInteger(), nullable=False),
        sa.Column("faceoff_win_percentage", sa.Float(), nullable=True),
        sa.Column("blocked_shots", sa.SmallInteger(), nullable=False),
        sa.Column("giveaways", sa.SmallInteger(), nullable=False),
        sa.Column("takeaways", sa.SmallInteger(), nullable=False),
        sa.Column("shifts", sa.SmallInteger(), nullable=False),
        sa.Column("time_on_ice_seconds", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id", "player_id", name="uq_player_game_stats_game_player"
        ),
    )
    op.create_index("ix_player_game_stats_game_id", "player_game_stats", ["game_id"])
    op.create_index(
        "ix_player_game_stats_player_id", "player_game_stats", ["player_id"]
    )
    op.create_index("ix_player_game_stats_team_id", "player_game_stats", ["team_id"])

    op.create_table(
        "goalie_game_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("sweater_number", sa.SmallInteger(), nullable=True),
        sa.Column("starter", sa.Boolean(), nullable=False),
        sa.Column("decision", sa.String(length=10), nullable=True),
        sa.Column("goals_against", sa.SmallInteger(), nullable=False),
        sa.Column("shots_against", sa.SmallInteger(), nullable=False),
        sa.Column("saves", sa.SmallInteger(), nullable=False),
        sa.Column("save_percentage", sa.Float(), nullable=True),
        sa.Column("even_strength_goals_against", sa.SmallInteger(), nullable=False),
        sa.Column("even_strength_saves", sa.SmallInteger(), nullable=False),
        sa.Column("even_strength_shots_against", sa.SmallInteger(), nullable=False),
        sa.Column("power_play_goals_against", sa.SmallInteger(), nullable=False),
        sa.Column("power_play_saves", sa.SmallInteger(), nullable=False),
        sa.Column("power_play_shots_against", sa.SmallInteger(), nullable=False),
        sa.Column("shorthanded_goals_against", sa.SmallInteger(), nullable=False),
        sa.Column("shorthanded_saves", sa.SmallInteger(), nullable=False),
        sa.Column("shorthanded_shots_against", sa.SmallInteger(), nullable=False),
        sa.Column("penalty_minutes", sa.SmallInteger(), nullable=False),
        sa.Column("time_on_ice_seconds", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id", "player_id", name="uq_goalie_game_stats_game_player"
        ),
    )
    op.create_index("ix_goalie_game_stats_game_id", "goalie_game_stats", ["game_id"])
    op.create_index(
        "ix_goalie_game_stats_player_id", "goalie_game_stats", ["player_id"]
    )
    op.create_index("ix_goalie_game_stats_team_id", "goalie_game_stats", ["team_id"])


def downgrade() -> None:
    """Drop box-score statistics and players."""
    op.drop_index("ix_goalie_game_stats_team_id", table_name="goalie_game_stats")
    op.drop_index("ix_goalie_game_stats_player_id", table_name="goalie_game_stats")
    op.drop_index("ix_goalie_game_stats_game_id", table_name="goalie_game_stats")
    op.drop_table("goalie_game_stats")
    op.drop_index("ix_player_game_stats_team_id", table_name="player_game_stats")
    op.drop_index("ix_player_game_stats_player_id", table_name="player_game_stats")
    op.drop_index("ix_player_game_stats_game_id", table_name="player_game_stats")
    op.drop_table("player_game_stats")
    op.drop_index("ix_team_game_stats_team_id", table_name="team_game_stats")
    op.drop_index("ix_team_game_stats_game_id", table_name="team_game_stats")
    op.drop_table("team_game_stats")
    op.drop_index("ix_players_nhl_id", table_name="players")
    op.drop_table("players")
