"""Resumable historical play-by-play ingestion using stored games as a queue."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.ingestion.orchestration.play_by_play import ingest_play_by_play
from sportsball.ingestion.orchestration.season_backfill import NHL_SEASON_GAME_TYPES
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, GameEvent, PlayByPlayBackfillGame

FINAL_GAME_STATES = frozenset({"FINAL", "OFF"})


@dataclass(frozen=True)
class PlayByPlayBackfillFailure:
    """One game that failed during the current invocation."""

    game_id: int
    error_message: str


@dataclass(frozen=True)
class PlayByPlayBackfillResult:
    """Progress across an inclusive season range after one invocation."""

    start_season: int
    end_season: int
    total_games: int
    completed_games: int
    failed_games: int
    attempted_this_run: int
    failures: tuple[PlayByPlayBackfillFailure, ...]

    @property
    def remaining_games(self) -> int:
        """Count final games that still lack normalized events."""
        return self.total_games - self.completed_games

    @property
    def pending_games(self) -> int:
        """Count incomplete games that are not parked as known failures."""
        return self.remaining_games - self.failed_games


def backfill_play_by_play(
    start_season: int,
    end_season: int,
    client: NhlClient,
    *,
    max_games: int | None = None,
    retry_failed: bool = False,
    on_game_complete: Callable[[int, str], None] | None = None,
) -> PlayByPlayBackfillResult:
    """Ingest missing final-game events without stopping on isolated failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if max_games is not None and max_games < 1:
        raise ValueError("max_games must be at least 1")

    _reconcile_completed_statuses(season_ids)
    candidates = _candidate_games(
        season_ids,
        max_games=max_games,
        retry_failed=retry_failed,
    )
    failures: list[PlayByPlayBackfillFailure] = []

    for game_pk, nhl_game_id in candidates:
        _mark_running(game_pk)
        try:
            ingest_play_by_play(nhl_game_id, client)
        except Exception as error:
            error_message = str(error)
            _mark_failed(game_pk, error_message)
            failures.append(
                PlayByPlayBackfillFailure(
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
    return PlayByPlayBackfillResult(
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
        .outerjoin(PlayByPlayBackfillGame, PlayByPlayBackfillGame.game_id == Game.id)
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
                PlayByPlayBackfillGame.game_id.is_(None),
                PlayByPlayBackfillGame.status != "failed",
            )
        )
    if max_games is not None:
        statement = statement.limit(max_games)

    with session_scope() as session:
        return [(game_pk, nhl_id) for game_pk, nhl_id in session.execute(statement)]


def _complete_game_ids():
    return select(GameEvent.game_id).group_by(GameEvent.game_id).having(func.count() > 0)


def _mark_running(game_id: int) -> None:
    status_insert = insert(PlayByPlayBackfillGame)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                game_id=game_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[PlayByPlayBackfillGame.game_id],
                set_={
                    "status": "running",
                    "attempt_count": PlayByPlayBackfillGame.attempt_count + 1,
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
            update(PlayByPlayBackfillGame)
            .where(PlayByPlayBackfillGame.game_id == game_id)
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
            update(PlayByPlayBackfillGame)
            .where(PlayByPlayBackfillGame.game_id == game_id)
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
                .select_from(PlayByPlayBackfillGame)
                .join(Game, Game.id == PlayByPlayBackfillGame.game_id)
                .where(
                    *game_filters,
                    PlayByPlayBackfillGame.status == "failed",
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
            update(PlayByPlayBackfillGame)
            .where(
                PlayByPlayBackfillGame.game_id == Game.id,
                Game.season_id.in_(season_ids),
                PlayByPlayBackfillGame.status != "completed",
                PlayByPlayBackfillGame.game_id.in_(complete_game_ids),
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )
