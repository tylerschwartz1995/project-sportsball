"""Retain checksummed MoneyPuck downloads independently of orchestration."""

import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.clients.moneypuck.client import MoneyPuckCsvFetch
from sportsball.config import settings
from sportsball.persistence.artifact_storage import store_object
from sportsball.persistence.models import SourceArtifact


def store_source_artifact(
    session: Session,
    run_id: uuid.UUID,
    artifact: MoneyPuckCsvFetch,
) -> None:
    # Preserve first-seen provenance and avoid unnecessary uploads on replays.
    existing = session.scalar(
        select(SourceArtifact.id).where(
            SourceArtifact.provider == "moneypuck",
            SourceArtifact.resource_type == f"season_{artifact.resource_type}",
            SourceArtifact.source_key == artifact.source_key,
            SourceArtifact.checksum == artifact.checksum,
        )
    )
    if existing is not None:
        return
    reference = (
        store_object(settings.artifact_s3_bucket, artifact.content, artifact.checksum)
        if settings.artifact_backend == "s3"
        else None
    )
    artifact_insert = insert(SourceArtifact)
    session.execute(
        artifact_insert.values(
            ingestion_run_id=run_id,
            provider="moneypuck",
            resource_type=f"season_{artifact.resource_type}",
            source_key=artifact.source_key,
            source_url=artifact.source_url,
            checksum=artifact.checksum,
            content_type=artifact.content_type,
            content_length=len(artifact.content),
            content=artifact.content if reference is None else None,
            s3_bucket=reference.bucket if reference else None,
            s3_key=reference.key if reference else None,
            s3_version_id=reference.version_id if reference else None,
        ).on_conflict_do_nothing(constraint="uq_source_artifact_identity")
    )
