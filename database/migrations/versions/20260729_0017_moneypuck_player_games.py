"""Add MoneyPuck player game-level advanced metrics.

Revision ID: 20260729_0017
Revises: 20260729_0016
Create Date: 2026-07-29
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0017"
down_revision: str | Sequence[str] | None = "20260729_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create player-game fact and resumable season-state tables."""
    op.create_table(
        "moneypuck_player_game_backfills",
        sa.Column("season_id", sa.Integer(), autoincrement=False, nullable=False),
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
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("season_id"),
    )
    _create_skater_table()
    _create_goalie_table()


def _create_skater_table() -> None:
    op.create_table(
        "moneypuck_skater_game_stats",
        *_identity_columns(include_position=True),
        sa.Column("shifts", sa.Float(), nullable=True),
        sa.Column("game_score", sa.Float(), nullable=True),
        sa.Column("on_ice_x_goals_percentage", sa.Float(), nullable=True),
        sa.Column("off_ice_x_goals_percentage", sa.Float(), nullable=True),
        sa.Column("on_ice_corsi_percentage", sa.Float(), nullable=True),
        sa.Column("off_ice_corsi_percentage", sa.Float(), nullable=True),
        sa.Column("on_ice_fenwick_percentage", sa.Float(), nullable=True),
        sa.Column("off_ice_fenwick_percentage", sa.Float(), nullable=True),
        sa.Column("individual_x_goals", sa.Float(), nullable=True),
        sa.Column("individual_goals", sa.Float(), nullable=True),
        sa.Column("individual_points", sa.Float(), nullable=True),
        sa.Column("individual_shot_attempts", sa.Float(), nullable=True),
        sa.Column("primary_assists", sa.Float(), nullable=True),
        sa.Column("secondary_assists", sa.Float(), nullable=True),
        sa.Column("shots_on_goal", sa.Float(), nullable=True),
        sa.Column("hits", sa.Float(), nullable=True),
        sa.Column("takeaways", sa.Float(), nullable=True),
        sa.Column("giveaways", sa.Float(), nullable=True),
        sa.Column("on_ice_x_goals_for", sa.Float(), nullable=True),
        sa.Column("on_ice_x_goals_against", sa.Float(), nullable=True),
        sa.Column("on_ice_goals_for", sa.Float(), nullable=True),
        sa.Column("on_ice_goals_against", sa.Float(), nullable=True),
        *_constraints("uq_moneypuck_skater_game_player_team_situation"),
    )
    _indexes("moneypuck_skater_game_stats")


def _create_goalie_table() -> None:
    op.create_table(
        "moneypuck_goalie_game_stats",
        *_identity_columns(include_position=False),
        sa.Column("expected_goals_against", sa.Float(), nullable=True),
        sa.Column("goals_against", sa.Float(), nullable=True),
        sa.Column("unblocked_shot_attempts_against", sa.Float(), nullable=True),
        sa.Column("expected_rebounds", sa.Float(), nullable=True),
        sa.Column("rebounds", sa.Float(), nullable=True),
        sa.Column("expected_freezes", sa.Float(), nullable=True),
        sa.Column("freezes", sa.Float(), nullable=True),
        sa.Column("expected_shots_on_goal_against", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_against", sa.Float(), nullable=True),
        sa.Column("flurry_adjusted_x_goals_against", sa.Float(), nullable=True),
        sa.Column("low_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column("medium_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_against", sa.Float(), nullable=True),
        *_constraints("uq_moneypuck_goalie_game_player_team_situation"),
    )
    _indexes("moneypuck_goalie_game_stats")


def _identity_columns(*, include_position: bool) -> list[sa.Column]:
    columns = [
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("opponent_team_id", sa.Integer(), nullable=False),
        sa.Column("situation", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
    ]
    if include_position:
        columns.append(sa.Column("position", sa.String(length=10), nullable=True))
    columns.extend(
        [
            sa.Column("is_home", sa.Boolean(), nullable=False),
            sa.Column("game_date", sa.Date(), nullable=False),
            sa.Column("ice_time_seconds", sa.Float(), nullable=False),
        ]
    )
    return columns


def _constraints(unique_name: str) -> list[Any]:
    return [
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["opponent_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id",
            "player_id",
            "team_id",
            "situation",
            name=unique_name,
        ),
    ]


def _indexes(table: str) -> None:
    for column in ("game_id", "player_id", "team_id", "situation"):
        op.create_index(f"ix_{table}_{column}", table, [column])


def downgrade() -> None:
    """Remove MoneyPuck player game-level storage."""
    op.drop_table("moneypuck_goalie_game_stats")
    op.drop_table("moneypuck_skater_game_stats")
    op.drop_table("moneypuck_player_game_backfills")
