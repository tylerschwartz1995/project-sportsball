"""Audited, resumable MoneyPuck line and pairing ingestion."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_seasons import (
    MONEYPUCK_FIRST_SEASON,
    store_source_artifact,
)
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.normalization.moneypuck_lines import moneypuck_line_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckLineBackfill,
    MoneyPuckLineGameStats,
    Season,
)
from sportsball.persistence.repositories.moneypuck_lines import (
    MoneyPuckLineRepository,
)


@dataclass(frozen=True)
class MoneyPuckLineIngestionResult:
    """Summary of one completed line/pairing season."""

    run_id: uuid.UUID
    season_id: int
    rows_processed: int


@dataclass(frozen=True)
class MoneyPuckLineBackfillResult:
    """Summary of a line/pairing range backfill."""

    start_season: int
    end_season: int
    total_seasons: int
    completed_seasons: int
    failed_seasons: int
    attempted_this_run: int
    failures: tuple[tuple[int, str], ...]

    @property
    def pending_seasons(self) -> int:
        return self.total_seasons - self.completed_seasons - self.failed_seasons


def ingest_moneypuck_lines(
    season_id: int,
    client: MoneyPuckClient,
) -> MoneyPuckLineIngestionResult:
    """Fetch, audit, normalize, and replace one line/pairing season."""
    start_year = season_id // 10_000
    if season_id < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck line coverage begins with 20082009")
    if season_id != start_year * 10_000 + start_year + 1:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_moneypuck_lines",
            status="running",
            parameters={"season_id": season_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id
    try:
        fetched = client.fetch_player_game_archive(start_year, "lines")
        frame = moneypuck_line_frame(season_id, fetched.content)
        with session_scope() as session:
            store_source_artifact(session, run_id, fetched)
            rows_processed = MoneyPuckLineRepository(session).replace(season_id, frame)
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=rows_processed,
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
    return MoneyPuckLineIngestionResult(run_id, season_id, rows_processed)


def backfill_moneypuck_lines(
    start_season: int,
    end_season: int,
    client: MoneyPuckClient,
    *,
    max_seasons: int | None = None,
    retry_failed: bool = False,
) -> MoneyPuckLineBackfillResult:
    """Ingest missing line seasons and isolate failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if season_ids[0] < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck line coverage begins with 20082009")
    if max_seasons is not None and max_seasons < 1:
        raise ValueError("max_seasons must be at least 1")
    _require_seasons(season_ids)
    completed_ids = _completed_ids(season_ids)
    _reconcile_completed(completed_ids)
    statement = (
        select(Season.id)
        .outerjoin(
            MoneyPuckLineBackfill,
            MoneyPuckLineBackfill.season_id == Season.id,
        )
        .where(Season.id.in_(set(season_ids) - completed_ids))
        .order_by(Season.id)
    )
    if not retry_failed:
        statement = statement.where(
            or_(
                MoneyPuckLineBackfill.season_id.is_(None),
                MoneyPuckLineBackfill.status != "failed",
            )
        )
    if max_seasons is not None:
        statement = statement.limit(max_seasons)
    with session_scope() as session:
        candidates = list(session.scalars(statement).all())
    failures: list[tuple[int, str]] = []
    for season_id in candidates:
        _mark_running(season_id)
        try:
            ingest_moneypuck_lines(season_id, client)
        except Exception as error:
            message = str(error)
            _set_status(season_id, "failed", message, None)
            failures.append((season_id, message))
        else:
            _set_status(season_id, "completed", None, datetime.now(UTC))
    completed_ids = _completed_ids(season_ids)
    with session_scope() as session:
        failed = (
            session.scalar(
                select(func.count())
                .select_from(MoneyPuckLineBackfill)
                .where(
                    MoneyPuckLineBackfill.season_id.in_(set(season_ids) - completed_ids),
                    MoneyPuckLineBackfill.status == "failed",
                )
            )
            or 0
        )
    return MoneyPuckLineBackfillResult(
        start_season,
        end_season,
        len(season_ids),
        len(completed_ids),
        failed,
        len(candidates),
        tuple(failures),
    )


def _require_seasons(season_ids: list[int]) -> None:
    with session_scope() as session:
        existing = set(session.scalars(select(Season.id).where(Season.id.in_(season_ids))).all())
    missing = set(season_ids) - existing
    if missing:
        raise ValueError(f"seasons must exist before MoneyPuck ingestion: {sorted(missing)}")


def _completed_ids(season_ids: list[int]) -> set[int]:
    statement = (
        select(Game.season_id)
        .join(MoneyPuckLineGameStats, MoneyPuckLineGameStats.game_id == Game.id)
        .where(Game.season_id.in_(season_ids))
        .distinct()
    )
    with session_scope() as session:
        return set(session.scalars(statement).all())


def _mark_running(season_id: int) -> None:
    status_insert = insert(MoneyPuckLineBackfill)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                season_id=season_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[MoneyPuckLineBackfill.season_id],
                set_={
                    "status": "running",
                    "attempt_count": MoneyPuckLineBackfill.attempt_count + 1,
                    "error_message": None,
                    "completed_at": None,
                    "updated_at": func.now(),
                },
            )
        )


def _set_status(
    season_id: int,
    status: str,
    error_message: str | None,
    completed_at: datetime | None,
) -> None:
    with session_scope() as session:
        session.execute(
            update(MoneyPuckLineBackfill)
            .where(MoneyPuckLineBackfill.season_id == season_id)
            .values(
                status=status,
                error_message=error_message,
                completed_at=completed_at,
                updated_at=datetime.now(UTC),
            )
        )


def _reconcile_completed(completed_ids: set[int]) -> None:
    if not completed_ids:
        return
    with session_scope() as session:
        session.execute(
            update(MoneyPuckLineBackfill)
            .where(
                MoneyPuckLineBackfill.season_id.in_(completed_ids),
                MoneyPuckLineBackfill.status != "completed",
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
