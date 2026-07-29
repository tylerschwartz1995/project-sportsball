"""Resumable MoneyPuck season-summary backfill."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_seasons import (
    MONEYPUCK_FIRST_SEASON,
    ingest_moneypuck_season,
)
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    MoneyPuckSeasonBackfill,
    MoneyPuckTeamSeasonStats,
    Season,
)


@dataclass(frozen=True)
class MoneyPuckSeasonFailure:
    """One isolated season import failure."""

    season_id: int
    error_message: str


@dataclass(frozen=True)
class MoneyPuckSeasonBackfillResult:
    """Summary of a MoneyPuck season range backfill."""

    start_season: int
    end_season: int
    total_seasons: int
    completed_seasons: int
    failed_seasons: int
    attempted_this_run: int
    failures: tuple[MoneyPuckSeasonFailure, ...]

    @property
    def pending_seasons(self) -> int:
        return self.total_seasons - self.completed_seasons - self.failed_seasons


def backfill_moneypuck_seasons(
    start_season: int,
    end_season: int,
    client: MoneyPuckClient,
    *,
    max_seasons: int | None = None,
    retry_failed: bool = False,
    on_season_complete: Callable[[int, str], None] | None = None,
) -> MoneyPuckSeasonBackfillResult:
    """Ingest missing MoneyPuck season summaries without stopping on failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if season_ids[0] < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck season summaries begin with 20082009")
    if max_seasons is not None and max_seasons < 1:
        raise ValueError("max_seasons must be at least 1")
    _require_seasons(season_ids)
    _reconcile_completed(season_ids)
    candidates = _candidates(
        season_ids,
        retry_failed=retry_failed,
        max_seasons=max_seasons,
    )
    failures: list[MoneyPuckSeasonFailure] = []
    for season_id in candidates:
        _mark_running(season_id)
        try:
            ingest_moneypuck_season(season_id, client)
        except Exception as error:
            message = str(error)
            _mark_failed(season_id, message)
            failures.append(
                MoneyPuckSeasonFailure(
                    season_id=season_id,
                    error_message=message,
                )
            )
            status = "failed"
        else:
            _mark_completed(season_id)
            status = "completed"
        if on_season_complete is not None:
            on_season_complete(season_id, status)

    completed, failed = _counts(season_ids)
    return MoneyPuckSeasonBackfillResult(
        start_season=start_season,
        end_season=end_season,
        total_seasons=len(season_ids),
        completed_seasons=completed,
        failed_seasons=failed,
        attempted_this_run=len(candidates),
        failures=tuple(failures),
    )


def _require_seasons(season_ids: list[int]) -> None:
    with session_scope() as session:
        existing = set(session.scalars(select(Season.id).where(Season.id.in_(season_ids))).all())
    missing = set(season_ids) - existing
    if missing:
        raise ValueError(f"seasons must exist before MoneyPuck ingestion: {sorted(missing)}")


def _candidates(
    season_ids: list[int],
    *,
    retry_failed: bool,
    max_seasons: int | None,
) -> list[int]:
    statement = (
        select(Season.id)
        .outerjoin(
            MoneyPuckSeasonBackfill,
            MoneyPuckSeasonBackfill.season_id == Season.id,
        )
        .where(
            Season.id.in_(season_ids),
            ~select(MoneyPuckTeamSeasonStats.id)
            .where(MoneyPuckTeamSeasonStats.season_id == Season.id)
            .exists(),
        )
        .order_by(Season.id)
    )
    if not retry_failed:
        statement = statement.where(
            or_(
                MoneyPuckSeasonBackfill.season_id.is_(None),
                MoneyPuckSeasonBackfill.status != "failed",
            )
        )
    if max_seasons is not None:
        statement = statement.limit(max_seasons)
    with session_scope() as session:
        return list(session.scalars(statement).all())


def _mark_running(season_id: int) -> None:
    status_insert = insert(MoneyPuckSeasonBackfill)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                season_id=season_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[MoneyPuckSeasonBackfill.season_id],
                set_={
                    "status": "running",
                    "attempt_count": MoneyPuckSeasonBackfill.attempt_count + 1,
                    "error_message": None,
                    "completed_at": None,
                    "updated_at": func.now(),
                },
            )
        )


def _mark_completed(season_id: int) -> None:
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(MoneyPuckSeasonBackfill)
            .where(MoneyPuckSeasonBackfill.season_id == season_id)
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )


def _mark_failed(season_id: int, error_message: str) -> None:
    with session_scope() as session:
        session.execute(
            update(MoneyPuckSeasonBackfill)
            .where(MoneyPuckSeasonBackfill.season_id == season_id)
            .values(
                status="failed",
                error_message=error_message,
                completed_at=None,
                updated_at=datetime.now(UTC),
            )
        )


def _reconcile_completed(season_ids: list[int]) -> None:
    completed_ids = select(MoneyPuckTeamSeasonStats.season_id).distinct()
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(MoneyPuckSeasonBackfill)
            .where(
                MoneyPuckSeasonBackfill.season_id.in_(season_ids),
                MoneyPuckSeasonBackfill.status != "completed",
                MoneyPuckSeasonBackfill.season_id.in_(completed_ids),
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )


def _counts(season_ids: list[int]) -> tuple[int, int]:
    with session_scope() as session:
        completed = (
            session.scalar(
                select(func.count(func.distinct(MoneyPuckTeamSeasonStats.season_id))).where(
                    MoneyPuckTeamSeasonStats.season_id.in_(season_ids)
                )
            )
            or 0
        )
        failed = (
            session.scalar(
                select(func.count())
                .select_from(MoneyPuckSeasonBackfill)
                .where(
                    MoneyPuckSeasonBackfill.season_id.in_(season_ids),
                    MoneyPuckSeasonBackfill.status == "failed",
                    MoneyPuckSeasonBackfill.season_id.not_in(
                        select(MoneyPuckTeamSeasonStats.season_id)
                    ),
                )
            )
            or 0
        )
    return completed, failed
