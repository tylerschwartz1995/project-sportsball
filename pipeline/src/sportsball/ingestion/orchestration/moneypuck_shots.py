"""Audited, resumable MoneyPuck shot ingestion."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_seasons import store_source_artifact
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.normalization.moneypuck_shots import moneypuck_shot_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckShot,
    MoneyPuckShotBackfill,
    Season,
)
from sportsball.persistence.repositories.moneypuck_shots import (
    MoneyPuckShotRepository,
)

MONEYPUCK_FIRST_SHOT_SEASON = 20072008


@dataclass(frozen=True)
class MoneyPuckShotIngestionResult:
    """Summary of one completed shot season."""

    run_id: uuid.UUID
    season_id: int
    rows_processed: int


@dataclass(frozen=True)
class MoneyPuckShotBackfillResult:
    """Summary of a shot range backfill."""

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


def ingest_moneypuck_shots(
    season_id: int,
    client: MoneyPuckClient,
) -> MoneyPuckShotIngestionResult:
    """Fetch, audit, normalize, and replace one shot season."""
    start_year = season_id // 10_000
    if season_id < MONEYPUCK_FIRST_SHOT_SEASON:
        raise ValueError("MoneyPuck shot coverage begins with 20072008")
    if season_id != start_year * 10_000 + start_year + 1:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_moneypuck_shots",
            status="running",
            parameters={"season_id": season_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id
    try:
        fetched = client.fetch_shot_archive(start_year)
        frame = moneypuck_shot_frame(season_id, fetched.content)
        with session_scope() as session:
            store_source_artifact(session, run_id, fetched)
            rows_processed = MoneyPuckShotRepository(session).replace(season_id, frame)
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
    return MoneyPuckShotIngestionResult(run_id, season_id, rows_processed)


def backfill_moneypuck_shots(
    start_season: int,
    end_season: int,
    client: MoneyPuckClient,
    *,
    max_seasons: int | None = None,
    retry_failed: bool = False,
) -> MoneyPuckShotBackfillResult:
    """Ingest missing shot seasons and isolate failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if season_ids[0] < MONEYPUCK_FIRST_SHOT_SEASON:
        raise ValueError("MoneyPuck shot coverage begins with 20072008")
    if max_seasons is not None and max_seasons < 1:
        raise ValueError("max_seasons must be at least 1")
    _require_seasons(season_ids)
    completed_ids = _completed_ids(season_ids)
    _reconcile_completed(completed_ids)
    statement = (
        select(Season.id)
        .outerjoin(
            MoneyPuckShotBackfill,
            MoneyPuckShotBackfill.season_id == Season.id,
        )
        .where(Season.id.in_(set(season_ids) - completed_ids))
        .order_by(Season.id)
    )
    if not retry_failed:
        statement = statement.where(
            or_(
                MoneyPuckShotBackfill.season_id.is_(None),
                MoneyPuckShotBackfill.status != "failed",
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
            ingest_moneypuck_shots(season_id, client)
        except Exception as error:
            message = str(error)
            _mark_failed(season_id, message)
            failures.append((season_id, message))
        else:
            _mark_completed(season_id)
    completed_ids = _completed_ids(season_ids)
    with session_scope() as session:
        failed = (
            session.scalar(
                select(func.count())
                .select_from(MoneyPuckShotBackfill)
                .where(
                    MoneyPuckShotBackfill.season_id.in_(set(season_ids) - completed_ids),
                    MoneyPuckShotBackfill.status == "failed",
                )
            )
            or 0
        )
    return MoneyPuckShotBackfillResult(
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
        .join(MoneyPuckShot, MoneyPuckShot.game_id == Game.id)
        .where(Game.season_id.in_(season_ids))
        .distinct()
    )
    with session_scope() as session:
        return set(session.scalars(statement).all())


def _mark_running(season_id: int) -> None:
    status_insert = insert(MoneyPuckShotBackfill)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                season_id=season_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[MoneyPuckShotBackfill.season_id],
                set_={
                    "status": "running",
                    "attempt_count": MoneyPuckShotBackfill.attempt_count + 1,
                    "error_message": None,
                    "completed_at": None,
                    "updated_at": func.now(),
                },
            )
        )


def _mark_completed(season_id: int) -> None:
    _set_status(season_id, "completed", None, datetime.now(UTC))


def _mark_failed(season_id: int, error_message: str) -> None:
    _set_status(season_id, "failed", error_message, None)


def _set_status(
    season_id: int,
    status: str,
    error_message: str | None,
    completed_at: datetime | None,
) -> None:
    with session_scope() as session:
        session.execute(
            update(MoneyPuckShotBackfill)
            .where(MoneyPuckShotBackfill.season_id == season_id)
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
            update(MoneyPuckShotBackfill)
            .where(
                MoneyPuckShotBackfill.season_id.in_(completed_ids),
                MoneyPuckShotBackfill.status != "completed",
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
