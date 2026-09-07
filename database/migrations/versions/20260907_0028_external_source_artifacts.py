"""Allow version-pinned S3 source artifacts without moving existing bytes."""

import sqlalchemy as sa
from alembic import op

revision = "20260907_0028"
down_revision = "20260906_0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "source_artifacts", "content", existing_type=sa.LargeBinary(), nullable=True
    )
    for name, length in (("s3_bucket", 63), ("s3_key", 1024), ("s3_version_id", 1024)):
        op.add_column(
            "source_artifacts", sa.Column(name, sa.String(length), nullable=True)
        )
    op.create_check_constraint(
        "ck_source_artifact_storage",
        "source_artifacts",
        "(content IS NOT NULL AND s3_bucket IS NULL AND s3_key IS NULL AND s3_version_id IS NULL) "
        "OR (content IS NULL AND s3_bucket IS NOT NULL AND s3_key IS NOT NULL AND s3_version_id IS NOT NULL)",
    )


def downgrade() -> None:
    # A downgrade must not orphan the only retained copy of an artifact.
    if (
        op.get_bind()
        .execute(
            sa.text("SELECT 1 FROM source_artifacts WHERE content IS NULL LIMIT 1")
        )
        .first()
    ):
        raise RuntimeError(
            "restore S3 artifacts into database storage before downgrading"
        )
    op.drop_constraint("ck_source_artifact_storage", "source_artifacts", type_="check")
    for name in ("s3_version_id", "s3_key", "s3_bucket"):
        op.drop_column("source_artifacts", name)
    op.alter_column(
        "source_artifacts", "content", existing_type=sa.LargeBinary(), nullable=False
    )
