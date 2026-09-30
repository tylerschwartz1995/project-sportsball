"""Preserve undefined standings percentages before a team's first game."""

import sqlalchemy as sa
from alembic import op

revision = "20260930_0029"
down_revision = "20260907_0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column in ("point_percentage", "win_percentage"):
        op.alter_column(
            "official_standings_snapshots",
            column,
            existing_type=sa.Float(),
            nullable=True,
        )


def downgrade() -> None:
    # Do not invent percentages or discard unplayed-team snapshots.
    if (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT 1 FROM official_standings_snapshots "
                "WHERE point_percentage IS NULL OR win_percentage IS NULL LIMIT 1"
            )
        )
        .first()
    ):
        raise RuntimeError("undefined standings percentages prevent downgrade")
    for column in ("point_percentage", "win_percentage"):
        op.alter_column(
            "official_standings_snapshots",
            column,
            existing_type=sa.Float(),
            nullable=False,
        )
