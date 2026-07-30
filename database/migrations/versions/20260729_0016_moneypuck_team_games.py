"""Add MoneyPuck team game-level advanced metrics.

Revision ID: 20260729_0016
Revises: 20260729_0015
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0016"
down_revision: str | Sequence[str] | None = "20260729_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the MoneyPuck team-game fact table."""
    op.create_table(
        "moneypuck_team_game_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("opponent_team_id", sa.Integer(), nullable=False),
        sa.Column("situation", sa.String(length=20), nullable=False),
        sa.Column("is_home", sa.Boolean(), nullable=False),
        sa.Column("playoff_game", sa.Boolean(), nullable=False),
        sa.Column("game_date", sa.Date(), nullable=False),
        sa.Column("ice_time_seconds", sa.Float(), nullable=False),
        sa.Column("x_goals_percentage", sa.Float(), nullable=True),
        sa.Column("corsi_percentage", sa.Float(), nullable=True),
        sa.Column("fenwick_percentage", sa.Float(), nullable=True),
        sa.Column("x_goals_for", sa.Float(), nullable=True),
        sa.Column("x_goals_against", sa.Float(), nullable=True),
        sa.Column("flurry_adjusted_x_goals_for", sa.Float(), nullable=True),
        sa.Column("flurry_adjusted_x_goals_against", sa.Float(), nullable=True),
        sa.Column("score_venue_adjusted_x_goals_for", sa.Float(), nullable=True),
        sa.Column("score_venue_adjusted_x_goals_against", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_for", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_against", sa.Float(), nullable=True),
        sa.Column("shot_attempts_for", sa.Float(), nullable=True),
        sa.Column("shot_attempts_against", sa.Float(), nullable=True),
        sa.Column("goals_for", sa.Float(), nullable=True),
        sa.Column("goals_against", sa.Float(), nullable=True),
        sa.Column("low_danger_x_goals_for", sa.Float(), nullable=True),
        sa.Column("low_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column("medium_danger_x_goals_for", sa.Float(), nullable=True),
        sa.Column("medium_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_for", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column("total_shot_credit_for", sa.Float(), nullable=True),
        sa.Column("total_shot_credit_against", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"]),
        sa.ForeignKeyConstraint(["opponent_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "game_id",
            "team_id",
            "situation",
            name="uq_moneypuck_team_game_team_situation",
        ),
    )
    for column in ("game_id", "team_id", "opponent_team_id", "situation"):
        op.create_index(
            f"ix_moneypuck_team_game_stats_{column}",
            "moneypuck_team_game_stats",
            [column],
        )


def downgrade() -> None:
    """Remove MoneyPuck team game-level metrics."""
    op.drop_table("moneypuck_team_game_stats")
