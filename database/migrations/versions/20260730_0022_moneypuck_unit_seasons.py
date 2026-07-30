"""Add Polars-derived MoneyPuck season unit statistics.

Revision ID: 20260730_0022
Revises: 20260730_0021
Create Date: 2026-07-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0022"
down_revision: str | Sequence[str] | None = "20260730_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create season-level forward-line and defensive-pairing aggregates."""
    op.create_table(
        "moneypuck_unit_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("player_1_id", sa.BigInteger(), nullable=False),
        sa.Column("player_2_id", sa.BigInteger(), nullable=False),
        sa.Column("player_3_id", sa.BigInteger(), nullable=True),
        sa.Column("unit_key", sa.String(length=24), nullable=False),
        sa.Column("unit_type", sa.String(length=10), nullable=False),
        sa.Column("derivation_version", sa.String(length=30), nullable=False),
        sa.Column("games_played", sa.Integer(), nullable=False),
        sa.Column("ice_time_seconds", sa.Float(), nullable=False),
        sa.Column("x_goals_percentage", sa.Float(), nullable=True),
        sa.Column("corsi_percentage", sa.Float(), nullable=True),
        sa.Column("x_goals_for", sa.Float(), nullable=True),
        sa.Column("x_goals_against", sa.Float(), nullable=True),
        sa.Column("goals_for", sa.Float(), nullable=True),
        sa.Column("goals_against", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_for", sa.Float(), nullable=True),
        sa.Column("shots_on_goal_against", sa.Float(), nullable=True),
        sa.Column("shot_attempts_for", sa.Float(), nullable=True),
        sa.Column("shot_attempts_against", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_for", sa.Float(), nullable=True),
        sa.Column("high_danger_x_goals_against", sa.Float(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["player_1_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["player_2_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["player_3_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "team_id",
            "unit_type",
            "unit_key",
            name="uq_moneypuck_unit_season",
        ),
    )
    for column in (
        "season_id",
        "team_id",
        "player_1_id",
        "player_2_id",
        "player_3_id",
        "unit_type",
        "ice_time_seconds",
    ):
        op.create_index(
            f"ix_moneypuck_unit_season_stats_{column}",
            "moneypuck_unit_season_stats",
            [column],
        )


def downgrade() -> None:
    """Remove season-level MoneyPuck unit aggregates."""
    op.drop_table("moneypuck_unit_season_stats")
