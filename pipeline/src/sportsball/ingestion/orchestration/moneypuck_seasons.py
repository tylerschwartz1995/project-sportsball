"""Audited ingestion of one MoneyPuck season-summary snapshot."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.clients.moneypuck.client import MoneyPuckClient, MoneyPuckCsvFetch
from sportsball.normalization.moneypuck_seasons import moneypuck_season_frames
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourceArtifact
from sportsball.persistence.repositories.moneypuck_seasons import (
    MoneyPuckSeasonRepository,
)

MONEYPUCK_FIRST_SEASON = 20082009
RESOURCE_TYPES = ("skaters", "goalies", "teams")


@dataclass(frozen=True)
class MoneyPuckSeasonIngestionResult:
    """Summary of one completed MoneyPuck season import."""

    run_id: uuid.UUID
    season_id: int
    skaters_processed: int
    goalies_processed: int
    teams_processed: int

    @property
    def records_processed(self) -> int:
        return self.skaters_processed + self.goalies_processed + self.teams_processed


def ingest_moneypuck_season(
    season_id: int,
    client: MoneyPuckClient,
) -> MoneyPuckSeasonIngestionResult:
    """Fetch, audit, normalize, and replace one MoneyPuck season."""
    start_year = _start_year(season_id)
    if season_id < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck season summaries begin with 20082009")
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_moneypuck_season",
            status="running",
            parameters={"season_id": season_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = {
            resource_type: client.fetch_season_summary(start_year, resource_type)
            for resource_type in RESOURCE_TYPES
        }
        normalized = moneypuck_season_frames(
            season_id,
            skaters_csv=fetched["skaters"].content,
            goalies_csv=fetched["goalies"].content,
            teams_csv=fetched["teams"].content,
        )
        with session_scope() as session:
            for artifact in fetched.values():
                store_source_artifact(session, run_id, artifact)
            result = MoneyPuckSeasonRepository(session).replace(
                [season_id],
                skaters=normalized.skaters,
                goalies=normalized.goalies,
                teams=normalized.teams,
            )
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=result.total,
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

    return MoneyPuckSeasonIngestionResult(
        run_id=run_id,
        season_id=season_id,
        skaters_processed=result.skaters,
        goalies_processed=result.goalies,
        teams_processed=result.teams,
    )


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


def _start_year(season_id: int) -> int:
    start_year = season_id // 10_000
    if season_id != start_year * 10_000 + start_year + 1:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    return start_year
