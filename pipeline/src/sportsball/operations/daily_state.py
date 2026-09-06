"""Database-backed coordination shared by scheduled and manual daily runs."""

import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select, text, update

from sportsball.operations.run_context import parent_run_id
from sportsball.persistence.database import engine, session_scope
from sportsball.persistence.models import DailyWork, Game, GameEvent, IngestionRun, TeamGameStats

DAILY_LOCK = 73120403


@contextmanager
def daily_lock() -> Iterator[None]:
    """Hold a dedicated session lock across the coordinator's short transactions."""
    with engine.connect() as connection:
        acquired = connection.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": DAILY_LOCK})
        connection.commit()
        if not acquired:
            raise RuntimeError("another daily ingestion is running; retry after it finishes")
        try:
            # Owning the same lock proves any earlier daily coordinator has exited.
            with session_scope() as session:
                abandoned = list(
                    session.scalars(
                        select(IngestionRun.id).where(
                            IngestionRun.job_name == "daily_update",
                            IngestionRun.status == "running",
                            IngestionRun.parameters["coordination_version"].as_integer() == 1,
                        )
                    ).all()
                )
                session.execute(
                    update(IngestionRun)
                    .where(
                        IngestionRun.status == "running",
                        (
                            IngestionRun.id.in_(abandoned)
                            | IngestionRun.parent_run_id.in_(abandoned)
                        ),
                    )
                    .values(
                        status="failed",
                        finished_at=datetime.now(UTC),
                        error_message="Interrupted daily run recovered under ingestion lock",
                    )
                )
            yield
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": DAILY_LOCK})
            connection.commit()


@contextmanager
def coordinating_run(run_id: uuid.UUID) -> Iterator[None]:
    token = parent_run_id.set(run_id)
    try:
        yield
    finally:
        parent_run_id.reset(token)


def pending_work(dataset: str, season_id: int) -> list[str]:
    """Include failed and interrupted work regardless of its original game date."""
    with session_scope() as session:
        return list(
            session.scalars(
                select(DailyWork.source_key).where(
                    DailyWork.dataset == dataset,
                    DailyWork.season_id == season_id,
                    DailyWork.status != "succeeded",
                )
            ).all()
        )


def begin_work(dataset: str, key: str, season_id: int, *, honor_retry: bool = True) -> bool:
    """Persist attempts before network I/O; interrupted attempts remain retryable."""
    now = datetime.now(UTC)
    with session_scope() as session:
        work = session.get(DailyWork, (dataset, key))
        if work is None:
            work = DailyWork(
                dataset=dataset, source_key=key, season_id=season_id, status="pending", attempts=0
            )
            session.add(work)
        if honor_retry and work.next_attempt_at is not None and work.next_attempt_at > now:
            return False
        work.season_id = season_id
        work.status = "running"
        work.attempts += 1
        work.run_id = parent_run_id.get()
        work.checked_at = now
        work.next_attempt_at = None
        return True


def queue_games(game_ids: list[int], season_id: int) -> None:
    """Keep corrections durable even if a bounded run stops before reaching them."""
    with session_scope() as session:
        for game_id in game_ids:
            for dataset in ("boxscore", "play_by_play"):
                key = str(game_id)
                work = session.get(DailyWork, (dataset, key))
                if work is None:
                    session.add(
                        DailyWork(
                            dataset=dataset,
                            source_key=key,
                            season_id=season_id,
                            status="pending",
                            attempts=0,
                        )
                    )
                elif work.status == "succeeded":
                    work.status = "pending"


def park_nonfinal_games(season_id: int, through: date) -> None:
    """Postponed or rescheduled games are not ingestion failures while awaiting play."""
    with session_scope() as session:
        future = set(
            str(value)
            for value in session.scalars(
                select(Game.nhl_id).where(
                    Game.season_id == season_id,
                    (~Game.state.in_(("FINAL", "OFF"))) | (Game.game_date > through),
                )
            ).all()
        )
        session.execute(
            update(DailyWork)
            .where(
                DailyWork.season_id == season_id,
                DailyWork.dataset.in_(("boxscore", "play_by_play")),
                DailyWork.source_key.in_(future),
                DailyWork.status != "succeeded",
            )
            .values(status="waiting_for_game", next_attempt_at=None)
        )


def due_games(game_ids: list[int]) -> list[int]:
    """Cooling-down failures must not consume the batch ahead of other games."""
    now = datetime.now(UTC)
    with session_scope() as session:
        cooling = {
            (w.dataset, w.source_key)
            for w in session.scalars(
                select(DailyWork).where(
                    DailyWork.dataset.in_(("boxscore", "play_by_play")),
                    DailyWork.next_attempt_at > now,
                )
            ).all()
        }
    return [
        game_id
        for game_id in game_ids
        if any((dataset, str(game_id)) not in cooling for dataset in ("boxscore", "play_by_play"))
    ]


def finish_work(
    dataset: str,
    key: str,
    *,
    error: str | None = None,
    coverage: dict[str, int | str | None] | None = None,
    waiting: bool = False,
) -> None:
    now = datetime.now(UTC)
    with session_scope() as session:
        work = session.get(DailyWork, (dataset, key))
        if work is None:
            raise RuntimeError(f"work was not started: {dataset}:{key}")
        work.status = "failed" if error else "waiting" if waiting else "succeeded"
        work.error_message = error
        work.checked_at = now
        if error or waiting:
            # Short network retries happen in the client. Persisted retries avoid
            # hammering a failing endpoint during manual reruns or recovery runs.
            work.next_attempt_at = now + timedelta(hours=2)
        else:
            work.next_attempt_at = None
        if error is None:
            work.published_at = now
        if coverage is not None:
            work.coverage = coverage


def final_games(season_id: int, through: date) -> list[Game]:
    with session_scope() as session:
        return list(
            session.scalars(
                select(Game)
                .where(
                    Game.season_id == season_id,
                    Game.game_type.in_((2, 3)),
                    Game.state.in_(("FINAL", "OFF")),
                    Game.game_date <= through,
                )
                .order_by(Game.game_date, Game.nhl_id)
            ).all()
        )


def missing_game_ids(season_id: int, through: date) -> set[int]:
    """Find holes throughout the season, including games outside correction windows."""
    games = final_games(season_id, through)
    ids = [game.id for game in games]
    with session_scope() as session:
        boxes = set(
            session.scalars(
                select(TeamGameStats.game_id)
                .where(
                    TeamGameStats.game_id.in_(ids),
                )
                .group_by(TeamGameStats.game_id)
                .having(func.count() == 2)
            ).all()
        )
        events = set(
            session.scalars(
                select(GameEvent.game_id)
                .where(
                    GameEvent.game_id.in_(ids),
                )
                .distinct()
            ).all()
        )
    return {game.nhl_id for game in games if game.id not in boxes or game.id not in events}
