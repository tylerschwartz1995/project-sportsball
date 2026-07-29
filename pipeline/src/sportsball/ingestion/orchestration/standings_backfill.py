"""Historical season-end official standings ingestion."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.ingestion.orchestration.standings import ingest_standings
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, OfficialStandingsSnapshot


@dataclass(frozen=True)
class StandingsBackfillFailure:
    """One season whose final official snapshot could not be ingested."""

    season_id: int
    snapshot_date: date
    error_message: str


@dataclass(frozen=True)
class StandingsBackfillResult:
    """Summary of an inclusive historical standings backfill."""

    start_season: int
    end_season: int
    attempted_this_run: int
    completed_seasons: int
    total_seasons: int
    failures: tuple[StandingsBackfillFailure, ...]


def backfill_final_standings(
    start_season: int,
    end_season: int,
    client: NhlClient,
    *,
    max_seasons: int | None = None,
    on_season_complete: Callable[[int, str], None] | None = None,
) -> StandingsBackfillResult:
    """Ingest missing official snapshots on each stored regular-season end date."""
    season_ids = season_ids_in_range(start_season, end_season)
    if max_seasons is not None and max_seasons < 1:
        raise ValueError("max_seasons must be at least 1")
    final_dates = _regular_season_final_dates(season_ids)
    missing_boundaries = set(season_ids) - final_dates.keys()
    if missing_boundaries:
        raise ValueError(
            f"seasons missing stored regular-season games: {sorted(missing_boundaries)}"
        )

    candidates = [
        (season_id, final_dates[season_id])
        for season_id in season_ids
        if not _has_snapshot(season_id, final_dates[season_id])
    ]
    if max_seasons is not None:
        candidates = candidates[:max_seasons]

    failures: list[StandingsBackfillFailure] = []
    for season_id, snapshot_date in candidates:
        try:
            result = ingest_standings(snapshot_date, client)
            if result.season_id != season_id:
                raise ValueError(f"expected season {season_id} but NHL returned {result.season_id}")
        except Exception as error:
            failures.append(
                StandingsBackfillFailure(
                    season_id=season_id,
                    snapshot_date=snapshot_date,
                    error_message=str(error),
                )
            )
            status = "failed"
        else:
            status = "completed"
        if on_season_complete is not None:
            on_season_complete(season_id, status)

    completed = sum(_has_snapshot(season_id, final_dates[season_id]) for season_id in season_ids)
    return StandingsBackfillResult(
        start_season=start_season,
        end_season=end_season,
        attempted_this_run=len(candidates),
        completed_seasons=completed,
        total_seasons=len(season_ids),
        failures=tuple(failures),
    )


def _regular_season_final_dates(season_ids: list[int]) -> dict[int, date]:
    with session_scope() as session:
        return {
            season_id: final_date
            for season_id, final_date in session.execute(
                select(Game.season_id, func.max(Game.game_date))
                .where(
                    Game.season_id.in_(season_ids),
                    Game.game_type == 2,
                )
                .group_by(Game.season_id)
            ).tuples()
        }


def _has_snapshot(season_id: int, snapshot_date: date) -> bool:
    with session_scope() as session:
        return bool(
            session.scalar(
                select(func.count())
                .select_from(OfficialStandingsSnapshot)
                .where(
                    OfficialStandingsSnapshot.season_id == season_id,
                    OfficialStandingsSnapshot.snapshot_date == snapshot_date,
                )
            )
        )
