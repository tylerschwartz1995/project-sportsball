"""Add NHL-published standings snapshots.

Revision ID: 20260729_0013
Revises: 20260729_0012
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0013"
down_revision: str | Sequence[str] | None = "20260729_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the official standings snapshot fact table."""
    op.create_table(
        "official_standings_snapshots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("game_type", sa.SmallInteger(), nullable=False),
        sa.Column("conference_name", sa.String(length=50), nullable=True),
        sa.Column("division_name", sa.String(length=50), nullable=True),
        sa.Column("games_played", sa.SmallInteger(), nullable=False),
        sa.Column("wins", sa.SmallInteger(), nullable=False),
        sa.Column("losses", sa.SmallInteger(), nullable=False),
        sa.Column("ties", sa.SmallInteger(), nullable=False),
        sa.Column("overtime_losses", sa.SmallInteger(), nullable=False),
        sa.Column("points", sa.SmallInteger(), nullable=False),
        sa.Column("regulation_wins", sa.SmallInteger(), nullable=False),
        sa.Column("regulation_plus_overtime_wins", sa.SmallInteger(), nullable=False),
        sa.Column("shootout_wins", sa.SmallInteger(), nullable=False),
        sa.Column("shootout_losses", sa.SmallInteger(), nullable=False),
        sa.Column("goals_for", sa.SmallInteger(), nullable=False),
        sa.Column("goals_against", sa.SmallInteger(), nullable=False),
        sa.Column("goal_differential", sa.SmallInteger(), nullable=False),
        sa.Column("point_percentage", sa.Float(), nullable=False),
        sa.Column("win_percentage", sa.Float(), nullable=False),
        sa.Column("league_rank", sa.SmallInteger(), nullable=False),
        sa.Column("conference_rank", sa.SmallInteger(), nullable=True),
        sa.Column("division_rank", sa.SmallInteger(), nullable=True),
        sa.Column("wildcard_rank", sa.SmallInteger(), nullable=True),
        sa.Column("clinch_indicator", sa.String(length=10), nullable=True),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "snapshot_date",
            "team_id",
            name="uq_official_standings_snapshot_date_team",
        ),
    )
    op.create_index(
        "ix_official_standings_season_date",
        "official_standings_snapshots",
        ["season_id", "snapshot_date"],
    )


def downgrade() -> None:
    """Remove NHL-published standings snapshots."""
    op.drop_index(
        "ix_official_standings_season_date",
        table_name="official_standings_snapshots",
    )
    op.drop_table("official_standings_snapshots")
