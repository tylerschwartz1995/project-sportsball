"""Audited ingestion of one NHL schedule date."""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.normalization.games import schedule_games_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.schedules import ScheduleRepository


@dataclass(frozen=True)
class ScheduleIngestionResult:
    """Summary of a completed schedule ingestion."""

    run_id: uuid.UUID
    game_date: date
    games_processed: int


def ingest_schedule_date(game_date: date, client: NhlClient) -> ScheduleIngestionResult:
    """Fetch, audit, normalize, and idempotently persist one schedule date."""
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_schedule_date",
            status="running",
            parameters={"game_date": game_date.isoformat()},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = client.fetch_schedule(game_date)
        frame = schedule_games_frame(fetched.schedule)

        with session_scope() as session:
            payload_insert = insert(SourcePayload)
            session.execute(
                payload_insert.values(
                    ingestion_run_id=run_id,
                    provider="nhl",
                    resource_type="schedule",
                    source_key=game_date.isoformat(),
                    checksum=fetched.checksum,
                    payload=fetched.payload,
                ).on_conflict_do_nothing(
                    constraint="uq_source_payload_identity",
                )
            )
            result = ScheduleRepository(session).upsert(frame)
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=result.games,
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

    return ScheduleIngestionResult(
        run_id=run_id,
        game_date=game_date,
        games_processed=result.games,
    )
