"""Audited ingestion of one official NHL standings snapshot."""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.normalization.standings import standings_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.standings import OfficialStandingsRepository


@dataclass(frozen=True)
class StandingsIngestionResult:
    """Summary of one completed official standings ingestion."""

    run_id: uuid.UUID
    snapshot_date: date
    season_id: int
    teams_processed: int


def ingest_standings(
    snapshot_date: date,
    client: NhlClient,
) -> StandingsIngestionResult:
    """Fetch, audit, normalize, and replace one official standings date."""
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_standings",
            status="running",
            parameters={"snapshot_date": snapshot_date.isoformat()},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = client.fetch_standings(snapshot_date)
        normalized = standings_frame(fetched.standings)
        if normalized.snapshot_date != snapshot_date:
            raise ValueError(
                f"requested standings {snapshot_date} but NHL returned {normalized.snapshot_date}"
            )
        with session_scope() as session:
            payload_insert = insert(SourcePayload)
            session.execute(
                payload_insert.values(
                    ingestion_run_id=run_id,
                    provider="nhl",
                    resource_type="standings",
                    source_key=snapshot_date.isoformat(),
                    checksum=fetched.checksum,
                    payload=fetched.payload,
                ).on_conflict_do_nothing(
                    constraint="uq_source_payload_identity",
                )
            )
            teams_processed = OfficialStandingsRepository(session).replace(normalized)
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=teams_processed,
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

    return StandingsIngestionResult(
        run_id=run_id,
        snapshot_date=snapshot_date,
        season_id=normalized.season_id,
        teams_processed=teams_processed,
    )
