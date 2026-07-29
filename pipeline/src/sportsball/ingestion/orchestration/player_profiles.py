"""Audited ingestion of one NHL player landing profile."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.normalization.player_profiles import normalize_player_profile
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.player_profiles import (
    PlayerProfileRepository,
)


@dataclass(frozen=True)
class PlayerProfileIngestionResult:
    """Summary of one completed player-profile ingestion."""

    run_id: uuid.UUID
    player_id: int


def ingest_player_profile(
    player_id: int,
    client: NhlClient,
) -> PlayerProfileIngestionResult:
    """Fetch, audit, normalize, and update one canonical player."""
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_player_profile",
            status="running",
            parameters={"player_id": player_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = client.fetch_player_profile(player_id)
        if fetched.profile.player_id != player_id:
            raise ValueError(
                f"requested player {player_id} but NHL returned player {fetched.profile.player_id}"
            )
        normalized = normalize_player_profile(fetched.profile)
        with session_scope() as session:
            payload_insert = insert(SourcePayload)
            session.execute(
                payload_insert.values(
                    ingestion_run_id=run_id,
                    provider="nhl",
                    resource_type="player_profile",
                    source_key=str(player_id),
                    checksum=fetched.checksum,
                    payload=fetched.payload,
                ).on_conflict_do_nothing(
                    constraint="uq_source_payload_identity",
                )
            )
            PlayerProfileRepository(session).update(normalized)
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=1,
                    finished_at=datetime.now(UTC),
                )
            )
    except Exception as error:
        with session_scope() as session:
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="failed",
                    error_message=str(error),
                    finished_at=datetime.now(UTC),
                )
            )
        raise

    return PlayerProfileIngestionResult(run_id=run_id, player_id=player_id)
