"""Audited ingestion of one NHL game-center box score."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.normalization.boxscores import boxscore_frames
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.boxscores import BoxscoreRepository


@dataclass(frozen=True)
class BoxscoreIngestionResult:
    """Summary of a completed box-score ingestion."""

    run_id: uuid.UUID
    game_id: int
    skaters_processed: int
    goalies_processed: int


def ingest_boxscore(game_id: int, client: NhlClient) -> BoxscoreIngestionResult:
    """Fetch, audit, normalize, and idempotently persist one box score."""
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_boxscore",
            status="running",
            parameters={"game_id": game_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = client.fetch_boxscore(game_id)
        if fetched.boxscore.id != game_id:
            raise ValueError(
                f"requested game {game_id} but NHL returned game {fetched.boxscore.id}"
            )
        if fetched.boxscore.game_state not in {"OFF", "FINAL"}:
            raise ValueError(
                f"game {game_id} is not final; NHL state is {fetched.boxscore.game_state}"
            )
        normalized = boxscore_frames(fetched.boxscore)

        with session_scope() as session:
            payload_insert = insert(SourcePayload)
            session.execute(
                payload_insert.values(
                    ingestion_run_id=run_id,
                    provider="nhl",
                    resource_type="boxscore",
                    source_key=str(game_id),
                    checksum=fetched.checksum,
                    payload=fetched.payload,
                ).on_conflict_do_nothing(
                    constraint="uq_source_payload_identity",
                )
            )
            result = BoxscoreRepository(session).upsert(normalized)
            records_processed = result.teams + result.skater_games + result.goalie_games
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

    return BoxscoreIngestionResult(
        run_id=run_id,
        game_id=game_id,
        skaters_processed=result.skater_games,
        goalies_processed=result.goalie_games,
    )
