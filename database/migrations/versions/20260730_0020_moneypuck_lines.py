"""Add MoneyPuck line and pairing game metrics.

Revision ID: 20260730_0020
Revises: 20260730_0019
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0020"
down_revision: str | Sequence[str] | None = "20260730_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create line-game fact and resumable season-state tables."""
    op.create_table(
        "moneypuck_line_backfills",
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
        "moneypuck_line_game_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("opponent_team_id", sa.Integer(), nullable=False),
        sa.Column("player_1_id", sa.BigInteger(), nullable=False),
        sa.Column("player_2_id", sa.BigInteger(), nullable=False),
        sa.Column("player_3_id", sa.BigInteger(), nullable=True),
        sa.Column("source_line_id", sa.String(length=24), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("unit_type", sa.String(length=10), nullable=False),
        sa.Column("situation", sa.String(length=20), nullable=False),
        sa.Column("is_home", sa.Boolean(), nullable=False),
        sa.Column("game_date", sa.Date(), nullable=False),
        sa.Column("ice_time_seconds", sa.Float(), nullable=False),
        sa.Column("ice_time_rank", sa.Float(), nullable=True),
        sa.Column("x_goals_percentage", sa.Float(), nullable=True),
        sa.Column("corsi_percentage", sa.Float(), nullable=True),
        sa.Column("fenwick_percentage", sa.Float(), nullable=True),
        sa.Column("x_goals_for", sa.Float(), nullable=True),
        sa.Column("x_goals_against", sa.Float(), nullable=True),
        sa.Column("goals_for", sa.Float(), nullable=True),
        sa.Column("goals_against", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_for", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_against", sa.Float(), nullable=True),
        sa.Column("shot_attempts_for", sa.Float(), nullable=True),
        sa.Column("shot_attempts_against", sa.Float(), nullable=True),
        sa.Column("score_venue_adjusted_x_goals_for", sa.Float(), nullable=True),
        sa.Column("score_venue_adjusted_x_goals_against", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_for", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column("total_shot_credit_for", sa.Float(), nullable=True),
        sa.Column("total_shot_credit_against", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["opponent_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["player_1_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["player_2_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["player_3_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id",
            "team_id",
            "source_line_id",
            name="uq_moneypuck_line_game_team_unit",
        ),
    )
    for column in (
        "game_id",
        "team_id",
        "player_1_id",
        "player_2_id",
        "player_3_id",
        "unit_type",
    ):
        op.create_index(
            f"ix_moneypuck_line_game_stats_{column}",
            "moneypuck_line_game_stats",
            [column],
        )


def downgrade() -> None:
    """Remove MoneyPuck line and pairing storage."""
    op.drop_table("moneypuck_line_game_stats")
    op.drop_table("moneypuck_line_backfills")
