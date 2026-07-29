"""Coordinate and reconcile schedule backfills across multiple NHL seasons."""

from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.season_backfill import (
    NHL_SEASON_GAME_TYPES,
    backfill_season_schedule,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, ScheduleBackfillCheckpoint


@dataclass(frozen=True)
class SeasonBackfillSummary:
    """Outcome and reconciliation counts for one season."""

    season_id: int
    status: str
    stored_games: int
    expected_games: int
    error_message: str | None = None


@dataclass(frozen=True)
class MultiSeasonBackfillResult:
    """Combined outcome for one multi-season invocation."""

    seasons: tuple[SeasonBackfillSummary, ...]

    @property
    def failed(self) -> int:
        """Count failed or unreconciled seasons."""
        return sum(season.status in {"failed", "reconciliation_failed"} for season in self.seasons)

    @property
    def completed(self) -> int:
        """Count seasons completed during this invocation."""
        return sum(season.status == "completed" for season in self.seasons)

    @property
    def skipped(self) -> int:
        """Count previously completed and reconciled seasons."""
        return sum(season.status == "skipped" for season in self.seasons)


def backfill_season_range(
    start_season: int,
    end_season: int,
    client: NhlClient,
    *,
    max_seasons: int | None = None,
    on_season_complete: Callable[[SeasonBackfillSummary], None] | None = None,
) -> MultiSeasonBackfillResult:
    """Backfill consecutive seasons while isolating and reporting failures."""
    season_ids = season_ids_in_range(start_season, end_season)
    if max_seasons is not None:
        if max_seasons < 1:
            raise ValueError("max_seasons must be at least 1")
        season_ids = season_ids[:max_seasons]

    summaries: list[SeasonBackfillSummary] = []

    def record(summary: SeasonBackfillSummary) -> None:
        summaries.append(summary)
        if on_season_complete is not None:
            on_season_complete(summary)

    for season_id in season_ids:
        checkpoint = _checkpoint_counts(season_id)
        if checkpoint is not None and checkpoint[0] == "completed":
            record(
                _reconcile(
                    season_id,
                    expected_games=checkpoint[1],
                    successful_status="skipped",
                )
            )
            continue

        try:
            result = backfill_season_schedule(season_id, client)
        except Exception as error:
            stored_games = _stored_game_count(season_id)
            expected_games = _checkpoint_counts(season_id)
            record(
                SeasonBackfillSummary(
                    season_id=season_id,
                    status="failed",
                    stored_games=stored_games,
                    expected_games=expected_games[1] if expected_games is not None else 0,
                    error_message=str(error),
                )
            )
            continue

        if result.status != "completed":
            record(
                SeasonBackfillSummary(
                    season_id=season_id,
                    status=result.status,
                    stored_games=_stored_game_count(season_id),
                    expected_games=result.games_processed,
                )
            )
            continue

        record(
            _reconcile(
                season_id,
                expected_games=result.games_processed,
                successful_status="completed",
            )
        )

    return MultiSeasonBackfillResult(seasons=tuple(summaries))


def season_ids_in_range(start_season: int, end_season: int) -> list[int]:
    """Return consecutive NHL season identifiers, inclusive."""
    start_year = _start_year(start_season)
    end_year = _start_year(end_season)
    if end_year < start_year:
        raise ValueError("end_season must not be earlier than start_season")
    return [year * 10_000 + year + 1 for year in range(start_year, end_year + 1)]


def _start_year(season_id: int) -> int:
    start_year, end_year = divmod(season_id, 10_000)
    if start_year < 1900 or end_year != start_year + 1:
        raise ValueError("season IDs must use NHL format YYYYYYYY, such as 20052006")
    return start_year


def _checkpoint_counts(season_id: int) -> tuple[str, int] | None:
    with session_scope() as session:
        row = session.execute(
            select(
                ScheduleBackfillCheckpoint.status,
                ScheduleBackfillCheckpoint.games_processed,
            ).where(ScheduleBackfillCheckpoint.season_id == season_id)
        ).one_or_none()
        return tuple(row) if row is not None else None


def _stored_game_count(season_id: int) -> int:
    with session_scope() as session:
        count = session.scalar(
            select(func.count())
            .select_from(Game)
            .where(
                Game.season_id == season_id,
                Game.game_type.in_(NHL_SEASON_GAME_TYPES),
            )
        )
        return count or 0


def _reconcile(
    season_id: int,
    *,
    expected_games: int,
    successful_status: str,
) -> SeasonBackfillSummary:
    stored_games = _stored_game_count(season_id)
    if stored_games != expected_games:
        return SeasonBackfillSummary(
            season_id=season_id,
            status="reconciliation_failed",
            stored_games=stored_games,
            expected_games=expected_games,
            error_message=(
                f"stored {stored_games} regular-season/playoff games; "
                f"checkpoint recorded {expected_games}"
            ),
        )
    return SeasonBackfillSummary(
        season_id=season_id,
        status=successful_status,
        stored_games=stored_games,
        expected_games=expected_games,
    )
