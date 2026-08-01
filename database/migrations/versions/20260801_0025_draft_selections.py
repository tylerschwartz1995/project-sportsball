"""Add the complete official NHL draft selection archive.

Revision ID: 20260801_0025
Revises: 20260731_0024
Create Date: 2026-08-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_0025"
down_revision: str | Sequence[str] | None = "20260731_0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create a source-faithful selection table with nullable NHL links."""
    op.create_table(
        "draft_selections",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("nhl_record_id", sa.Integer(), nullable=False),
        sa.Column("draft_master_id", sa.Integer(), nullable=False),
        sa.Column("draft_year", sa.SmallInteger(), nullable=False),
        sa.Column("draft_date", sa.Date(), nullable=False),
        sa.Column("round_number", sa.SmallInteger(), nullable=False),
        sa.Column("pick_in_round", sa.SmallInteger(), nullable=False),
        sa.Column("overall_pick_number", sa.SmallInteger(), nullable=False),
        sa.Column("drafting_team_id", sa.Integer(), nullable=True),
        sa.Column("drafting_team_nhl_id", sa.Integer(), nullable=False),
        sa.Column("drafting_team_abbrev", sa.String(length=10), nullable=False),
        sa.Column("original_pick_owner_abbrev", sa.String(length=10), nullable=False),
        sa.Column("pick_owner_history", sa.String(length=100), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=True),
        sa.Column("nhl_player_id", sa.BigInteger(), nullable=True),
        sa.Column("central_scouting_player_id", sa.Integer(), nullable=True),
        sa.Column("player_name", sa.String(length=200), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=True),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("position", sa.String(length=10), nullable=True),
        sa.Column("country_code", sa.String(length=10), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("birth_place", sa.String(length=150), nullable=True),
        sa.Column("height_in_inches", sa.SmallInteger(), nullable=True),
        sa.Column("weight_in_pounds", sa.SmallInteger(), nullable=True),
        sa.Column("shoots_catches", sa.String(length=2), nullable=True),
        sa.Column("amateur_league", sa.String(length=50), nullable=True),
        sa.Column("amateur_club_name", sa.String(length=150), nullable=True),
        sa.Column(
            "supplemental_draft",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column(
            "removed_outright",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
        sa.Column("removed_outright_reason", sa.String(length=200), nullable=True),
        sa.CheckConstraint(
            "overall_pick_number > 0",
            name="ck_draft_selections_overall_pick",
        ),
        sa.CheckConstraint(
            "pick_in_round > 0",
            name="ck_draft_selections_pick_in_round",
        ),
        sa.CheckConstraint("round_number > 0", name="ck_draft_selections_round"),
        sa.ForeignKeyConstraint(["drafting_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "nhl_record_id",
            name="uq_draft_selections_nhl_record",
        ),
        sa.UniqueConstraint(
            "draft_year",
            "overall_pick_number",
            name="uq_draft_selections_year_overall_pick",
        ),
    )
    op.create_index(
        "ix_draft_selections_draft_year",
        "draft_selections",
        ["draft_year"],
    )
    op.create_index(
        "ix_draft_selections_nhl_player_id",
        "draft_selections",
        ["nhl_player_id"],
    )
    op.create_index(
        "ix_draft_selections_player_id",
        "draft_selections",
        ["player_id"],
    )
    op.create_index(
        "ix_draft_selections_year_team",
        "draft_selections",
        ["draft_year", "drafting_team_abbrev"],
    )


def downgrade() -> None:
    """Remove the complete draft archive."""
    op.drop_index("ix_draft_selections_year_team", table_name="draft_selections")
    op.drop_index("ix_draft_selections_player_id", table_name="draft_selections")
    op.drop_index("ix_draft_selections_nhl_player_id", table_name="draft_selections")
    op.drop_index("ix_draft_selections_draft_year", table_name="draft_selections")
    op.drop_table("draft_selections")
