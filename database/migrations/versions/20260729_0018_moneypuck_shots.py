"""Add MoneyPuck shot-level metrics.

Revision ID: 20260729_0018
Revises: 20260729_0017
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0018"
down_revision: str | Sequence[str] | None = "20260729_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create shot fact and resumable season-state tables."""
    op.create_table(
        "moneypuck_shot_backfills",
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
    op.create_table(
        "moneypuck_shots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("shooter_player_id", sa.BigInteger(), nullable=True),
        sa.Column("goalie_player_id", sa.BigInteger(), nullable=True),
        sa.Column("shooting_team_id", sa.Integer(), nullable=False),
        sa.Column("defending_team_id", sa.Integer(), nullable=False),
        sa.Column("source_shot_id", sa.BigInteger(), nullable=False),
        sa.Column("source_event_index", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=20), nullable=False),
        sa.Column("period", sa.SmallInteger(), nullable=False),
        sa.Column("time_in_period_seconds", sa.SmallInteger(), nullable=False),
        sa.Column("is_home_team", sa.Boolean(), nullable=False),
        sa.Column("is_playoff_game", sa.Boolean(), nullable=False),
        sa.Column("is_goal", sa.Boolean(), nullable=False),
        sa.Column("was_on_goal", sa.Boolean(), nullable=False),
        sa.Column("shot_type", sa.String(length=30), nullable=True),
        sa.Column("location", sa.String(length=30), nullable=True),
        sa.Column("x_coord", sa.Float(), nullable=True),
        sa.Column("y_coord", sa.Float(), nullable=True),
        sa.Column("x_coord_adjusted", sa.Float(), nullable=True),
        sa.Column("y_coord_adjusted", sa.Float(), nullable=True),
        sa.Column("shot_distance", sa.Float(), nullable=True),
        sa.Column("shot_angle", sa.Float(), nullable=True),
        sa.Column("x_goal", sa.Float(), nullable=True),
        sa.Column("x_rebound", sa.Float(), nullable=True),
        sa.Column("x_froze", sa.Float(), nullable=True),
        sa.Column("x_shot_was_on_goal", sa.Float(), nullable=True),
        sa.Column("x_play_stopped", sa.Float(), nullable=True),
        sa.Column("x_play_continued_in_zone", sa.Float(), nullable=True),
        sa.Column("x_play_continued_outside_zone", sa.Float(), nullable=True),
        sa.Column("generated_rebound", sa.Boolean(), nullable=False),
        sa.Column("was_rebound", sa.Boolean(), nullable=False),
        sa.Column("was_rush", sa.Boolean(), nullable=False),
        sa.Column("was_off_wing", sa.Boolean(), nullable=False),
        sa.Column("was_empty_net", sa.Boolean(), nullable=False),
        sa.Column("home_skaters_on_ice", sa.SmallInteger(), nullable=True),
        sa.Column("away_skaters_on_ice", sa.SmallInteger(), nullable=True),
        sa.Column("home_team_goals", sa.SmallInteger(), nullable=True),
        sa.Column("away_team_goals", sa.SmallInteger(), nullable=True),
        sa.Column("time_since_last_event", sa.Float(), nullable=True),
        sa.Column("distance_from_last_event", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["shooter_player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["goalie_player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["shooting_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["defending_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id", "source_event_index", name="uq_moneypuck_shots_game_event"
        ),
    )
    for column in (
        "game_id",
        "shooter_player_id",
        "goalie_player_id",
        "shooting_team_id",
        "event_type",
    ):
        op.create_index(f"ix_moneypuck_shots_{column}", "moneypuck_shots", [column])


def downgrade() -> None:
    """Remove MoneyPuck shot-level storage."""
    op.drop_table("moneypuck_shots")
    op.drop_table("moneypuck_shot_backfills")
