"""Audited ingestion of one NHL game-center play-by-play response."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.normalization.play_by_play import play_by_play_frames
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.play_by_play import PlayByPlayRepository


@dataclass(frozen=True)
class PlayByPlayIngestionResult:
    """Summary of one completed game-event ingestion."""

    run_id: uuid.UUID
    game_id: int
    events_processed: int
    participants_processed: int


def ingest_play_by_play(game_id: int, client: NhlClient) -> PlayByPlayIngestionResult:
    """Fetch, audit, normalize, and replace one game's event snapshot."""
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_play_by_play",
            status="running",
            parameters={"game_id": game_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = client.fetch_play_by_play(game_id)
        if fetched.play_by_play.id != game_id:
            raise ValueError(
                f"requested game {game_id} but NHL returned game {fetched.play_by_play.id}"
            )
        if fetched.play_by_play.game_state not in {"OFF", "FINAL"}:
            raise ValueError(
                f"game {game_id} is not final; NHL state is {fetched.play_by_play.game_state}"
            )
        normalized = play_by_play_frames(fetched.play_by_play)

        with session_scope() as session:
            payload_insert = insert(SourcePayload)
            session.execute(
                payload_insert.values(
                    ingestion_run_id=run_id,
                    provider="nhl",
                    resource_type="play_by_play",
                    source_key=str(game_id),
                    checksum=fetched.checksum,
                    payload=fetched.payload,
                ).on_conflict_do_nothing(
                    constraint="uq_source_payload_identity",
                )
            )
            result = PlayByPlayRepository(session).replace(normalized)
            records_processed = result.events + result.participants
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=records_processed,
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

    return PlayByPlayIngestionResult(
        run_id=run_id,
        game_id=game_id,
        events_processed=result.events,
        participants_processed=result.participants,
    )
