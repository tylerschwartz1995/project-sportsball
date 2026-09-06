"""Retain checksummed MoneyPuck downloads independently of orchestration."""

import uuid

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.clients.moneypuck.client import MoneyPuckCsvFetch
from sportsball.persistence.models import SourceArtifact


def store_source_artifact(
    session: Session,
    run_id: uuid.UUID,
    artifact: MoneyPuckCsvFetch,
) -> None:
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
            content=artifact.content,
        ).on_conflict_do_nothing(constraint="uq_source_artifact_identity")
    )
