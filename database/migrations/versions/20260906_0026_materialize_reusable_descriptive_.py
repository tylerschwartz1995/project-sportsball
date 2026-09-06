"""Materialize reusable descriptive analytics

Revision ID: 20260906_0026
Revises: 20260801_0025
Create Date: 2026-09-06 10:49:12.633691
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260906_0026"
down_revision: str | Sequence[str] | None = "20260801_0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply the migration."""
    op.create_table(
        "historical_era_rates",
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.Integer(), nullable=False),
        sa.Column("points_per_game", sa.Numeric(), nullable=True),
        sa.Column("save_percentage", sa.Numeric(), nullable=True),
        sa.Column("definition_version", sa.String(length=40), nullable=False),
        sa.Column("ingestion_run_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["ingestion_run_id"], ["ingestion_runs.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("season_id", "game_type"),
    )
    op.create_table(
        "historical_peak_stats",
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("game_type", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("window", sa.Integer(), nullable=False),
        sa.Column("end_season_id", sa.Integer(), nullable=False),
        sa.Column("start_season_id", sa.Integer(), nullable=False),
        sa.Column("games_played", sa.Integer(), nullable=False),
        sa.Column("goals", sa.Integer(), nullable=True),
        sa.Column("assists", sa.Integer(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=True),
        sa.Column("wins", sa.Integer(), nullable=True),
        sa.Column("shutouts", sa.Integer(), nullable=True),
        sa.Column("common_teams", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("definition_version", sa.String(length=40), nullable=False),
        sa.Column("ingestion_run_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["end_season_id"], ["seasons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["ingestion_run_id"], ["ingestion_runs.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["start_season_id"], ["seasons.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint(
            "player_id", "game_type", "kind", "window", "end_season_id"
        ),
    )
    op.create_table(
        "schedule_game_context",
        sa.Column("game_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("opponent_prior_games", sa.Integer(), nullable=False),
        sa.Column("opponent_results_season_id", sa.Integer(), nullable=True),
        sa.Column("opponent_expected_goals_season_id", sa.Integer(), nullable=True),
        sa.Column("opponent_points_percentage", sa.Float(), nullable=True),
        sa.Column("opponent_goal_differential_per_game", sa.Float(), nullable=True),
        sa.Column("opponent_expected_goals_percentage", sa.Float(), nullable=True),
        sa.Column("rest_days", sa.Integer(), nullable=True),
        sa.Column("is_back_to_back", sa.Boolean(), nullable=False),
        sa.Column("definition_version", sa.String(length=40), nullable=False),
        sa.Column("ingestion_run_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["ingestion_run_id"], ["ingestion_runs.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["opponent_expected_goals_season_id"], ["seasons.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["opponent_results_season_id"], ["seasons.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("game_id", "team_id"),
    )


def downgrade() -> None:
    """Reverse the migration."""
    op.drop_table("schedule_game_context")
    op.drop_table("historical_peak_stats")
    op.drop_table("historical_era_rates")
