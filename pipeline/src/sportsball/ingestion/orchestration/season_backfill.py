"""Resumable historical NHL season schedule backfills."""

from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import ScheduleBackfillCheckpoint

NHL_SEASON_GAME_TYPES = frozenset({2, 3})


@dataclass(frozen=True)
class SeasonBackfillResult:
    """Current durable state after a season backfill invocation."""

    season_id: int
    status: str
    requests_completed: int
    games_processed: int
    next_date: date | None


def backfill_season_schedule(
    season_id: int,
    client: NhlClient,
    *,
    max_requests: int | None = None,
) -> SeasonBackfillResult:
    """Ingest weekly schedule pages from the regular-season start through playoffs."""
    _validate_season_id(season_id)
    if max_requests is not None and max_requests < 1:
        raise ValueError("max_requests must be at least 1")

    checkpoint = _load_checkpoint(season_id)
    if checkpoint is None:
        checkpoint = _initialize_checkpoint(season_id, client)
    if checkpoint.status == "completed":
        return _result(checkpoint)

    requests_this_run = 0
    while checkpoint.next_date is not None and checkpoint.next_date <= checkpoint.end_date:
        if max_requests is not None and requests_this_run >= max_requests:
            checkpoint.status = "paused"
            _save_checkpoint(checkpoint)
            return _result(checkpoint)

        current_date = checkpoint.next_date
        try:
            page = ingest_schedule_date(
                current_date,
                client,
                game_types=NHL_SEASON_GAME_TYPES,
            )
        except Exception as error:
            checkpoint.status = "failed"
            checkpoint.error_message = str(error)
            _save_checkpoint(checkpoint)
            raise

        checkpoint.requests_completed += 1
        checkpoint.games_processed += page.games_processed
        next_date = page.next_start_date
        if next_date is not None and next_date <= current_date:
            checkpoint.status = "failed"
            checkpoint.error_message = (
                f"NHL nextStartDate {next_date} did not advance beyond {current_date}"
            )
            _save_checkpoint(checkpoint)
            raise ValueError(checkpoint.error_message)
        checkpoint.next_date = next_date
        checkpoint.error_message = None
        requests_this_run += 1

        if next_date is None or next_date > checkpoint.end_date:
            checkpoint.status = "completed"
        else:
            checkpoint.status = "running"
        _save_checkpoint(checkpoint)

    if checkpoint.status != "completed":
        checkpoint.status = "completed"
        _save_checkpoint(checkpoint)
    return _result(checkpoint)


def _validate_season_id(season_id: int) -> None:
    start_year, end_year = divmod(season_id, 10_000)
    if start_year < 1900 or end_year != start_year + 1:
        raise ValueError("season_id must use the NHL format YYYYYYYY, such as 20052006")


def _load_checkpoint(season_id: int) -> ScheduleBackfillCheckpoint | None:
    with session_scope() as session:
        return session.scalar(
            select(ScheduleBackfillCheckpoint).where(
                ScheduleBackfillCheckpoint.season_id == season_id
            )
        )


def _initialize_checkpoint(
    season_id: int,
    client: NhlClient,
) -> ScheduleBackfillCheckpoint:
    start_year = season_id // 10_000
    boundaries = client.get_schedule(date(start_year, 10, 1))
    if boundaries.regular_season_start_date is None or boundaries.playoff_end_date is None:
        raise ValueError(f"NHL schedule response did not include boundaries for {season_id}")

    checkpoint_insert = insert(ScheduleBackfillCheckpoint)
    with session_scope() as session:
        session.execute(
            checkpoint_insert.values(
                season_id=season_id,
                next_date=boundaries.regular_season_start_date,
                end_date=boundaries.playoff_end_date,
                status="pending",
                requests_completed=0,
                games_processed=0,
            ).on_conflict_do_nothing(index_elements=[ScheduleBackfillCheckpoint.season_id])
        )
        checkpoint = session.get(ScheduleBackfillCheckpoint, season_id)
        if checkpoint is None:
            raise RuntimeError(f"failed to initialize checkpoint for {season_id}")
        return checkpoint


def _save_checkpoint(checkpoint: ScheduleBackfillCheckpoint) -> None:
    checkpoint_values = {
        "next_date": checkpoint.next_date,
        "end_date": checkpoint.end_date,
        "status": checkpoint.status,
        "requests_completed": checkpoint.requests_completed,
        "games_processed": checkpoint.games_processed,
        "error_message": checkpoint.error_message,
    }
    checkpoint_insert = insert(ScheduleBackfillCheckpoint)
    with session_scope() as session:
        session.execute(
            checkpoint_insert.values(
                season_id=checkpoint.season_id,
                **checkpoint_values,
            ).on_conflict_do_update(
                index_elements=[ScheduleBackfillCheckpoint.season_id],
                set_={**checkpoint_values, "updated_at": func.now()},
            )
        )


def _result(checkpoint: ScheduleBackfillCheckpoint) -> SeasonBackfillResult:
    return SeasonBackfillResult(
        season_id=checkpoint.season_id,
        status=checkpoint.status,
        requests_completed=checkpoint.requests_completed,
        games_processed=checkpoint.games_processed,
        next_date=checkpoint.next_date,
    )
