"""Audited, resumable MoneyPuck player game-level ingestion."""

import uuid
from collections.abc import Callable
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
from sportsball.normalization.moneypuck_player_games import (
    moneypuck_player_game_frames,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckGoalieGameStats,
    MoneyPuckPlayerGameBackfill,
    MoneyPuckSkaterGameStats,
    Season,
)
from sportsball.persistence.repositories.moneypuck_player_games import (
    MoneyPuckPlayerGameRepository,
)


@dataclass(frozen=True)
class MoneyPuckPlayerGameIngestionResult:
    """Summary of one completed player-game season."""

    run_id: uuid.UUID
    season_id: int
    skaters_processed: int
    goalies_processed: int

    @property
    def records_processed(self) -> int:
        return self.skaters_processed + self.goalies_processed


@dataclass(frozen=True)
class MoneyPuckPlayerGameFailure:
    """One isolated player-game season failure."""

    season_id: int
    error_message: str


@dataclass(frozen=True)
class MoneyPuckPlayerGameBackfillResult:
    """Summary of a player-game range backfill."""

    start_season: int
    end_season: int
    total_seasons: int
    completed_seasons: int
    failed_seasons: int
    attempted_this_run: int
    failures: tuple[MoneyPuckPlayerGameFailure, ...]

    @property
    def pending_seasons(self) -> int:
        return self.total_seasons - self.completed_seasons - self.failed_seasons


def ingest_moneypuck_player_games(
    season_id: int,
    client: MoneyPuckClient,
) -> MoneyPuckPlayerGameIngestionResult:
    """Fetch, audit, normalize, and replace one regular season."""
    start_year = season_id // 10_000
    if season_id < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck player-game coverage begins with 20082009")
    if season_id != start_year * 10_000 + start_year + 1:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_moneypuck_player_games",
            status="running",
            parameters={"season_id": season_id},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        skaters = client.fetch_player_game_archive(start_year, "skaters")
        goalies = client.fetch_player_game_archive(start_year, "goalies")
        frames = moneypuck_player_game_frames(
            season_id,
            skaters_archive=skaters.content,
            goalies_archive=goalies.content,
        )
        with session_scope() as session:
            store_source_artifact(session, run_id, skaters)
            store_source_artifact(session, run_id, goalies)
            result = MoneyPuckPlayerGameRepository(session).replace(
                season_id,
                skaters=frames.skaters,
                goalies=frames.goalies,
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

    return MoneyPuckPlayerGameIngestionResult(
        run_id=run_id,
        season_id=season_id,
        skaters_processed=result.skaters,
        goalies_processed=result.goalies,
    )


def backfill_moneypuck_player_games(
    start_season: int,
    end_season: int,
    client: MoneyPuckClient,
    *,
    max_seasons: int | None = None,
    retry_failed: bool = False,
    on_season_complete: Callable[[int, str], None] | None = None,
) -> MoneyPuckPlayerGameBackfillResult:
    """Ingest missing player-game seasons while isolating failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if season_ids[0] < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck player-game coverage begins with 20082009")
    if max_seasons is not None and max_seasons < 1:
        raise ValueError("max_seasons must be at least 1")
    _require_seasons(season_ids)
    completed_ids = _completed_season_ids(season_ids)
    _reconcile_completed(completed_ids)
    candidates = _candidates(
        season_ids,
        completed_ids,
        retry_failed=retry_failed,
        max_seasons=max_seasons,
    )
    failures: list[MoneyPuckPlayerGameFailure] = []
    for season_id in candidates:
        _mark_running(season_id)
        try:
            ingest_moneypuck_player_games(season_id, client)
        except Exception as error:
            message = str(error)
            _mark_failed(season_id, message)
            failures.append(MoneyPuckPlayerGameFailure(season_id, message))
            status = "failed"
        else:
            _mark_completed(season_id)
            status = "completed"
        if on_season_complete is not None:
            on_season_complete(season_id, status)
    completed_ids = _completed_season_ids(season_ids)
    failed = _failed_count(season_ids, completed_ids)
    return MoneyPuckPlayerGameBackfillResult(
        start_season=start_season,
        end_season=end_season,
        total_seasons=len(season_ids),
        completed_seasons=len(completed_ids),
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


def _completed_season_ids(season_ids: list[int]) -> set[int]:
    completed = select(Season.id).where(
        Season.id.in_(season_ids),
        select(MoneyPuckSkaterGameStats.id)
        .join(Game, Game.id == MoneyPuckSkaterGameStats.game_id)
        .where(Game.season_id == Season.id)
        .exists(),
        select(MoneyPuckGoalieGameStats.id)
        .join(Game, Game.id == MoneyPuckGoalieGameStats.game_id)
        .where(Game.season_id == Season.id)
        .exists(),
    )
    with session_scope() as session:
        return set(session.scalars(completed).all())


def _candidates(
    season_ids: list[int],
    completed_ids: set[int],
    *,
    retry_failed: bool,
    max_seasons: int | None,
) -> list[int]:
    statement = (
        select(Season.id)
        .outerjoin(
            MoneyPuckPlayerGameBackfill,
            MoneyPuckPlayerGameBackfill.season_id == Season.id,
        )
        .where(Season.id.in_(set(season_ids) - completed_ids))
        .order_by(Season.id)
    )
    if not retry_failed:
        statement = statement.where(
            or_(
                MoneyPuckPlayerGameBackfill.season_id.is_(None),
                MoneyPuckPlayerGameBackfill.status != "failed",
            )
        )
    if max_seasons is not None:
        statement = statement.limit(max_seasons)
    with session_scope() as session:
        return list(session.scalars(statement).all())


def _mark_running(season_id: int) -> None:
    status_insert = insert(MoneyPuckPlayerGameBackfill)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                season_id=season_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[MoneyPuckPlayerGameBackfill.season_id],
                set_={
                    "status": "running",
                    "attempt_count": MoneyPuckPlayerGameBackfill.attempt_count + 1,
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
            update(MoneyPuckPlayerGameBackfill)
            .where(MoneyPuckPlayerGameBackfill.season_id == season_id)
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
            update(MoneyPuckPlayerGameBackfill)
            .where(MoneyPuckPlayerGameBackfill.season_id == season_id)
            .values(
                status="failed",
                error_message=error_message,
                completed_at=None,
                updated_at=datetime.now(UTC),
            )
        )


def _reconcile_completed(completed_ids: set[int]) -> None:
    if not completed_ids:
        return
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(MoneyPuckPlayerGameBackfill)
            .where(
                MoneyPuckPlayerGameBackfill.season_id.in_(completed_ids),
                MoneyPuckPlayerGameBackfill.status != "completed",
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )


def _failed_count(season_ids: list[int], completed_ids: set[int]) -> int:
    with session_scope() as session:
        return (
            session.scalar(
                select(func.count())
                .select_from(MoneyPuckPlayerGameBackfill)
                .where(
                    MoneyPuckPlayerGameBackfill.season_id.in_(set(season_ids) - completed_ids),
                    MoneyPuckPlayerGameBackfill.status == "failed",
                )
            )
            or 0
        )
