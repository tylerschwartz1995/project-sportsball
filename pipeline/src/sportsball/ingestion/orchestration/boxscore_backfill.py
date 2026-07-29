"""Resumable historical box-score ingestion using stored games as a queue."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.boxscores import ingest_boxscore
from sportsball.ingestion.orchestration.multi_season_backfill import (
    season_ids_in_range,
)
from sportsball.ingestion.orchestration.season_backfill import (
    NHL_SEASON_GAME_TYPES,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    BoxscoreBackfillGame,
    Game,
    TeamGameStats,
)

FINAL_GAME_STATES = frozenset({"FINAL", "OFF"})


@dataclass(frozen=True)
class BoxscoreBackfillFailure:
    """One game that failed during the current invocation."""

    game_id: int
    error_message: str


@dataclass(frozen=True)
class BoxscoreBackfillResult:
    """Progress across an inclusive season range after one invocation."""

    start_season: int
    end_season: int
    total_games: int
    completed_games: int
    failed_games: int
    attempted_this_run: int
    failures: tuple[BoxscoreBackfillFailure, ...]

    @property
    def remaining_games(self) -> int:
        """Count final games that still do not have a complete box score."""
        return self.total_games - self.completed_games

    @property
    def pending_games(self) -> int:
        """Count incomplete games that are not parked as known failures."""
        return self.remaining_games - self.failed_games


def backfill_boxscores(
    start_season: int,
    end_season: int,
    client: NhlClient,
    *,
    max_games: int | None = None,
    retry_failed: bool = False,
    on_game_complete: Callable[[int, str], None] | None = None,
) -> BoxscoreBackfillResult:
    """Ingest missing final-game box scores without stopping on isolated failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if max_games is not None and max_games < 1:
        raise ValueError("max_games must be at least 1")

    _reconcile_completed_statuses(season_ids)
    candidates = _candidate_games(
        season_ids,
        max_games=max_games,
        retry_failed=retry_failed,
    )
    failures: list[BoxscoreBackfillFailure] = []

    for game_pk, nhl_game_id in candidates:
        _mark_running(game_pk)
        try:
            ingest_boxscore(nhl_game_id, client)
        except Exception as error:
            error_message = str(error)
            _mark_failed(game_pk, error_message)
            failures.append(
                BoxscoreBackfillFailure(
                    game_id=nhl_game_id,
                    error_message=error_message,
                )
            )
            status = "failed"
        else:
            _mark_completed(game_pk)
            status = "completed"

        if on_game_complete is not None:
            on_game_complete(nhl_game_id, status)

    total_games, completed_games, failed_games = _progress_counts(season_ids)
    return BoxscoreBackfillResult(
        start_season=start_season,
        end_season=end_season,
        total_games=total_games,
        completed_games=completed_games,
        failed_games=failed_games,
        attempted_this_run=len(candidates),
        failures=tuple(failures),
    )


def _candidate_games(
    season_ids: list[int],
    *,
    max_games: int | None,
    retry_failed: bool,
) -> list[tuple[int, int]]:
    complete_game_ids = _complete_game_ids()
    statement = (
        select(Game.id, Game.nhl_id)
        .outerjoin(BoxscoreBackfillGame, BoxscoreBackfillGame.game_id == Game.id)
        .where(
            Game.season_id.in_(season_ids),
            Game.game_type.in_(NHL_SEASON_GAME_TYPES),
            Game.state.in_(FINAL_GAME_STATES),
            Game.id.not_in(complete_game_ids),
        )
        .order_by(Game.game_date, Game.nhl_id)
    )
    if not retry_failed:
        statement = statement.where(
            or_(
                BoxscoreBackfillGame.game_id.is_(None),
                BoxscoreBackfillGame.status != "failed",
            )
        )
    if max_games is not None:
        statement = statement.limit(max_games)

    with session_scope() as session:
        return [(game_pk, nhl_id) for game_pk, nhl_id in session.execute(statement)]


def _complete_game_ids():
    return select(TeamGameStats.game_id).group_by(TeamGameStats.game_id).having(func.count() == 2)


def _mark_running(game_id: int) -> None:
    status_insert = insert(BoxscoreBackfillGame)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                game_id=game_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[BoxscoreBackfillGame.game_id],
                set_={
                    "status": "running",
                    "attempt_count": BoxscoreBackfillGame.attempt_count + 1,
                    "error_message": None,
                    "completed_at": None,
                    "updated_at": func.now(),
                },
            )
        )


def _mark_completed(game_id: int) -> None:
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(BoxscoreBackfillGame)
            .where(BoxscoreBackfillGame.game_id == game_id)
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )


def _mark_failed(game_id: int, error_message: str) -> None:
    with session_scope() as session:
        session.execute(
            update(BoxscoreBackfillGame)
            .where(BoxscoreBackfillGame.game_id == game_id)
            .values(
                status="failed",
                error_message=error_message,
                completed_at=None,
                updated_at=datetime.now(UTC),
            )
        )


def _progress_counts(season_ids: list[int]) -> tuple[int, int, int]:
    game_filters = (
        Game.season_id.in_(season_ids),
        Game.game_type.in_(NHL_SEASON_GAME_TYPES),
        Game.state.in_(FINAL_GAME_STATES),
    )
    completed = _complete_game_ids().subquery()
    with session_scope() as session:
        total_games = (
            session.scalar(select(func.count()).select_from(Game).where(*game_filters)) or 0
        )
        completed_games = (
            session.scalar(
                select(func.count())
                .select_from(Game)
                .join(completed, completed.c.game_id == Game.id)
                .where(*game_filters)
            )
            or 0
        )
        failed_games = (
            session.scalar(
                select(func.count())
                .select_from(BoxscoreBackfillGame)
                .join(Game, Game.id == BoxscoreBackfillGame.game_id)
                .where(
                    *game_filters,
                    BoxscoreBackfillGame.status == "failed",
                    Game.id.not_in(select(completed.c.game_id)),
                )
            )
            or 0
        )
    return total_games, completed_games, failed_games


def _reconcile_completed_statuses(season_ids: list[int]) -> None:
    complete_game_ids = _complete_game_ids()
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(BoxscoreBackfillGame)
            .where(
                BoxscoreBackfillGame.game_id == Game.id,
                Game.season_id.in_(season_ids),
                BoxscoreBackfillGame.status != "completed",
                BoxscoreBackfillGame.game_id.in_(complete_game_ids),
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )
