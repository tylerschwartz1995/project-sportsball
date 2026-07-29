"""Create canonical season, team, and game tables.

Revision ID: 20260729_0002
Revises: 20260729_0001
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0002"
down_revision: str | Sequence[str] | None = "20260729_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create schedule entities and extend ingestion-run accounting."""
    op.add_column(
        "ingestion_runs",
        sa.Column(
            "records_processed", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.create_table(
        "seasons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("start_year", sa.SmallInteger(), nullable=False),
        sa.Column("end_year", sa.SmallInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nhl_id", sa.Integer(), nullable=False),
        sa.Column("abbreviation", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_teams_abbreviation", "teams", ["abbreviation"])
    op.create_index("ix_teams_nhl_id", "teams", ["nhl_id"], unique=True)
    op.create_table(
        "games",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nhl_id", sa.BigInteger(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("game_date", sa.Date(), nullable=False),
        sa.Column("start_time_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("state", sa.String(length=20), nullable=False),
        sa.Column("away_team_id", sa.Integer(), nullable=False),
        sa.Column("home_team_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["away_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["home_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_games_away_team_id", "games", ["away_team_id"])
    op.create_index("ix_games_game_date", "games", ["game_date"])
    op.create_index("ix_games_home_team_id", "games", ["home_team_id"])
    op.create_index("ix_games_nhl_id", "games", ["nhl_id"], unique=True)
    op.create_index("ix_games_season_id", "games", ["season_id"])


def downgrade() -> None:
    """Drop schedule entities and ingestion-run accounting."""
    op.drop_index("ix_games_season_id", table_name="games")
    op.drop_index("ix_games_nhl_id", table_name="games")
    op.drop_index("ix_games_home_team_id", table_name="games")
    op.drop_index("ix_games_game_date", table_name="games")
    op.drop_index("ix_games_away_team_id", table_name="games")
    op.drop_table("games")
    op.drop_index("ix_teams_nhl_id", table_name="teams")
    op.drop_index("ix_teams_abbreviation", table_name="teams")
    op.drop_table("teams")
    op.drop_table("seasons")
    op.drop_column("ingestion_runs", "records_processed")
