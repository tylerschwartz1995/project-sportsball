"""Add canonical player profiles and resumable backfill state.

Revision ID: 20260729_0011
Revises: 20260729_0010
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0011"
down_revision: str | Sequence[str] | None = "20260729_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add biographical, physical, current-team, and draft attributes."""
    columns = (
        sa.Column("first_name", sa.String(length=100), nullable=True),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("birth_city", sa.String(length=100), nullable=True),
        sa.Column("birth_state_province", sa.String(length=100), nullable=True),
        sa.Column("birth_country", sa.String(length=10), nullable=True),
        sa.Column("height_in_inches", sa.SmallInteger(), nullable=True),
        sa.Column("weight_in_pounds", sa.SmallInteger(), nullable=True),
        sa.Column("shoots_catches", sa.String(length=2), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("current_team_id", sa.Integer(), nullable=True),
        sa.Column("sweater_number", sa.SmallInteger(), nullable=True),
        sa.Column("player_slug", sa.String(length=150), nullable=True),
        sa.Column("draft_year", sa.SmallInteger(), nullable=True),
        sa.Column("draft_team_abbrev", sa.String(length=10), nullable=True),
        sa.Column("draft_round", sa.SmallInteger(), nullable=True),
        sa.Column("draft_pick_in_round", sa.SmallInteger(), nullable=True),
        sa.Column("draft_overall_pick", sa.SmallInteger(), nullable=True),
        sa.Column("profile_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in columns:
        op.add_column("players", column)
    op.create_foreign_key(
        "fk_players_current_team_id_teams",
        "players",
        "teams",
        ["current_team_id"],
        ["id"],
    )
    op.create_table(
        "player_profile_backfill_players",
        sa.Column("player_id", sa.BigInteger(), autoincrement=False, nullable=False),
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
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("player_id"),
    )


def downgrade() -> None:
    """Remove profile backfill state and canonical profile attributes."""
    op.drop_table("player_profile_backfill_players")
    op.drop_constraint(
        "fk_players_current_team_id_teams",
        "players",
        type_="foreignkey",
    )
    for column in (
        "profile_updated_at",
        "draft_overall_pick",
        "draft_pick_in_round",
        "draft_round",
        "draft_team_abbrev",
        "draft_year",
        "player_slug",
        "sweater_number",
        "current_team_id",
        "is_active",
        "shoots_catches",
        "weight_in_pounds",
        "height_in_inches",
        "birth_country",
        "birth_state_province",
        "birth_city",
        "birth_date",
        "last_name",
        "first_name",
    ):
        op.drop_column("players", column)
