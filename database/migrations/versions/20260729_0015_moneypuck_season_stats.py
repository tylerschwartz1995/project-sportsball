"""Add MoneyPuck source artifacts and season summary metrics.

Revision ID: 20260729_0015
Revises: 20260729_0014
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260729_0015"
down_revision: str | Sequence[str] | None = "20260729_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create file provenance, queue, and normalized season tables."""
    op.create_table(
        "source_artifacts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("ingestion_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("resource_type", sa.String(length=100), nullable=False),
        sa.Column("source_key", sa.String(length=200), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("content_length", sa.BigInteger(), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["ingestion_run_id"], ["ingestion_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "resource_type",
            "source_key",
            "checksum",
            name="uq_source_artifact_identity",
        ),
    )
    op.create_table(
        "moneypuck_season_backfills",
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
    _create_team_table()


def _create_skater_table() -> None:
    op.create_table(
        "moneypuck_skater_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("situation", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("position", sa.String(length=10), nullable=True),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("ice_time_seconds", sa.Float(), nullable=False),
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
        sa.Column("on_ice_x_goals_for", sa.Float(), nullable=True),
        sa.Column("on_ice_x_goals_against", sa.Float(), nullable=True),
        sa.Column("on_ice_goals_for", sa.Float(), nullable=True),
        sa.Column("on_ice_goals_against", sa.Float(), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "player_id",
            "team_id",
            "situation",
            name="uq_moneypuck_skater_season_player_team_situation",
        ),
    )
    _indexes("moneypuck_skater_season_stats", include_player=True)


def _create_goalie_table() -> None:
    op.create_table(
        "moneypuck_goalie_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("situation", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("ice_time_seconds", sa.Float(), nullable=False),
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
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "player_id",
            "team_id",
            "situation",
            name="uq_moneypuck_goalie_season_player_team_situation",
        ),
    )
    _indexes("moneypuck_goalie_season_stats", include_player=True)


def _create_team_table() -> None:
    op.create_table(
        "moneypuck_team_season_stats",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("situation", sa.String(length=20), nullable=False),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("ice_time_seconds", sa.Float(), nullable=False),
        sa.Column("x_goals_percentage", sa.Float(), nullable=True),
        sa.Column("corsi_percentage", sa.Float(), nullable=True),
        sa.Column("fenwick_percentage", sa.Float(), nullable=True),
        sa.Column("x_goals_for", sa.Float(), nullable=True),
        sa.Column("x_goals_against", sa.Float(), nullable=True),
        sa.Column("goals_for", sa.Float(), nullable=True),
        sa.Column("goals_against", sa.Float(), nullable=True),
        sa.Column("shot_attempts_for", sa.Float(), nullable=True),
        sa.Column("shot_attempts_against", sa.Float(), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "season_id",
            "team_id",
            "situation",
            name="uq_moneypuck_team_season_team_situation",
        ),
    )
    _indexes("moneypuck_team_season_stats", include_player=False)


def _indexes(table_name: str, *, include_player: bool) -> None:
    op.create_index(f"ix_{table_name}_season_id", table_name, ["season_id"])
    op.create_index(f"ix_{table_name}_team_id", table_name, ["team_id"])
    op.create_index(f"ix_{table_name}_situation", table_name, ["situation"])
    if include_player:
        op.create_index(f"ix_{table_name}_player_id", table_name, ["player_id"])


def downgrade() -> None:
    """Remove MoneyPuck season summaries and file provenance."""
    op.drop_table("moneypuck_team_season_stats")
    op.drop_table("moneypuck_goalie_season_stats")
    op.drop_table("moneypuck_skater_season_stats")
    op.drop_table("moneypuck_season_backfills")
    op.drop_table("source_artifacts")
