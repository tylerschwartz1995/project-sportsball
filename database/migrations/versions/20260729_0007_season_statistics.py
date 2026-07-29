"""Create derived skater, goalie, and team season statistics.

Revision ID: 20260729_0007
Revises: 20260729_0006
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0007"
down_revision: str | Sequence[str] | None = "20260729_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create materialized season-level traditional statistics."""
    op.create_table(
        "skater_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("teams_played_for", sa.SmallInteger(), nullable=False),
        sa.Column("goals", sa.SmallInteger(), nullable=False),
        sa.Column("assists", sa.SmallInteger(), nullable=False),
        sa.Column("points", sa.SmallInteger(), nullable=False),
        sa.Column("plus_minus", sa.SmallInteger(), nullable=False),
        sa.Column("penalty_minutes", sa.Integer(), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.Column("power_play_goals", sa.SmallInteger(), nullable=False),
        sa.Column("shots_on_goal", sa.Integer(), nullable=False),
        sa.Column("blocked_shots", sa.Integer(), nullable=False),
        sa.Column("giveaways", sa.Integer(), nullable=False),
        sa.Column("takeaways", sa.Integer(), nullable=False),
        sa.Column("shifts", sa.Integer(), nullable=False),
        sa.Column("time_on_ice_seconds", sa.Integer(), nullable=True),
        sa.Column("time_on_ice_games", sa.SmallInteger(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_skater_season_stats_season_type_player",
        ),
    )
    op.create_index(
        "ix_skater_season_stats_game_type",
        "skater_season_stats",
        ["game_type"],
    )
    op.create_index(
        "ix_skater_season_stats_player_id",
        "skater_season_stats",
        ["player_id"],
    )
    op.create_index(
        "ix_skater_season_stats_season_id",
        "skater_season_stats",
        ["season_id"],
    )

    op.create_table(
        "goalie_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("teams_played_for", sa.SmallInteger(), nullable=False),
        sa.Column("games_started", sa.SmallInteger(), nullable=False),
        sa.Column("wins", sa.SmallInteger(), nullable=False),
        sa.Column("losses", sa.SmallInteger(), nullable=False),
        sa.Column("overtime_losses", sa.SmallInteger(), nullable=False),
        sa.Column("goals_against", sa.Integer(), nullable=False),
        sa.Column("shots_against", sa.Integer(), nullable=False),
        sa.Column("saves", sa.Integer(), nullable=False),
        sa.Column("save_percentage", sa.Float(), nullable=True),
        sa.Column("even_strength_goals_against", sa.Integer(), nullable=False),
        sa.Column("even_strength_saves", sa.Integer(), nullable=False),
        sa.Column("even_strength_shots_against", sa.Integer(), nullable=False),
        sa.Column("power_play_goals_against", sa.Integer(), nullable=False),
        sa.Column("power_play_saves", sa.Integer(), nullable=False),
        sa.Column("power_play_shots_against", sa.Integer(), nullable=False),
        sa.Column("shorthanded_goals_against", sa.Integer(), nullable=False),
        sa.Column("shorthanded_saves", sa.Integer(), nullable=False),
        sa.Column("shorthanded_shots_against", sa.Integer(), nullable=False),
        sa.Column("penalty_minutes", sa.Integer(), nullable=False),
        sa.Column("time_on_ice_seconds", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_goalie_season_stats_season_type_player",
        ),
    )
    op.create_index(
        "ix_goalie_season_stats_game_type",
        "goalie_season_stats",
        ["game_type"],
    )
    op.create_index(
        "ix_goalie_season_stats_player_id",
        "goalie_season_stats",
        ["player_id"],
    )
    op.create_index(
        "ix_goalie_season_stats_season_id",
        "goalie_season_stats",
        ["season_id"],
    )

    op.create_table(
        "team_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("wins", sa.SmallInteger(), nullable=False),
        sa.Column("losses", sa.SmallInteger(), nullable=False),
        sa.Column("goals_for", sa.Integer(), nullable=False),
        sa.Column("goals_against", sa.Integer(), nullable=False),
        sa.Column("shots_for", sa.Integer(), nullable=False),
        sa.Column("shots_against", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "game_type",
            "team_id",
            name="uq_team_season_stats_season_type_team",
        ),
    )
    op.create_index(
        "ix_team_season_stats_game_type",
        "team_season_stats",
        ["game_type"],
    )
    op.create_index(
        "ix_team_season_stats_season_id",
        "team_season_stats",
        ["season_id"],
    )
    op.create_index(
        "ix_team_season_stats_team_id",
        "team_season_stats",
        ["team_id"],
    )


def downgrade() -> None:
    """Drop materialized season statistics."""
    op.drop_index("ix_team_season_stats_team_id", table_name="team_season_stats")
    op.drop_index("ix_team_season_stats_season_id", table_name="team_season_stats")
    op.drop_index("ix_team_season_stats_game_type", table_name="team_season_stats")
    op.drop_table("team_season_stats")
    op.drop_index("ix_goalie_season_stats_season_id", table_name="goalie_season_stats")
    op.drop_index("ix_goalie_season_stats_player_id", table_name="goalie_season_stats")
    op.drop_index("ix_goalie_season_stats_game_type", table_name="goalie_season_stats")
    op.drop_table("goalie_season_stats")
    op.drop_index("ix_skater_season_stats_season_id", table_name="skater_season_stats")
    op.drop_index("ix_skater_season_stats_player_id", table_name="skater_season_stats")
    op.drop_index("ix_skater_season_stats_game_type", table_name="skater_season_stats")
    op.drop_table("skater_season_stats")
