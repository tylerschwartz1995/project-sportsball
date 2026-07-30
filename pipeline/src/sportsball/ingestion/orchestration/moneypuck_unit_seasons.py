"""Build season unit aggregates from stored MoneyPuck game-level facts."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import polars as pl
from sqlalchemy import select, update

from sportsball.ingestion.orchestration.multi_season_backfill import (
    season_ids_in_range,
)
from sportsball.normalization.moneypuck_unit_seasons import (
    moneypuck_unit_season_frame,
)
from sportsball.persistence.database import engine, session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckLineGameStats,
)
from sportsball.persistence.repositories.moneypuck_unit_seasons import (
    MoneyPuckUnitSeasonRepository,
)


@dataclass(frozen=True)
class MoneyPuckUnitSeasonBuildResult:
    """Summary of one successful season-unit materialization."""

    run_id: uuid.UUID
    start_season: int
    end_season: int
    rows_processed: int


def build_moneypuck_unit_seasons(
    start_season: int,
    end_season: int,
) -> MoneyPuckUnitSeasonBuildResult:
    """Build and transactionally replace unit aggregates for an inclusive range."""
    season_ids = season_ids_in_range(start_season, end_season)
    with session_scope() as session:
        run = IngestionRun(
            job_name="build_moneypuck_unit_seasons",
            status="running",
            parameters={"start_season": start_season, "end_season": end_season},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        game_units = _load_game_units(season_ids)
        if game_units.is_empty():
            raise ValueError("no MoneyPuck line or pairing game records found")
        units = moneypuck_unit_season_frame(game_units)
        with session_scope() as session:
            rows_processed = MoneyPuckUnitSeasonRepository(session).replace(
                season_ids,
                units,
            )
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

    return MoneyPuckUnitSeasonBuildResult(
        run_id=run_id,
        start_season=start_season,
        end_season=end_season,
        rows_processed=rows_processed,
    )


def _load_game_units(season_ids: list[int]) -> pl.DataFrame:
    statement = (
        select(
            MoneyPuckLineGameStats.game_id,
            Game.season_id,
            MoneyPuckLineGameStats.team_id,
            MoneyPuckLineGameStats.player_1_id,
            MoneyPuckLineGameStats.player_2_id,
            MoneyPuckLineGameStats.player_3_id,
            MoneyPuckLineGameStats.unit_type,
            MoneyPuckLineGameStats.ice_time_seconds,
            MoneyPuckLineGameStats.x_goals_for,
            MoneyPuckLineGameStats.x_goals_against,
            MoneyPuckLineGameStats.goals_for,
            MoneyPuckLineGameStats.goals_against,
            MoneyPuckLineGameStats.shots_on_goal_for,
            MoneyPuckLineGameStats.shots_on_goal_against,
            MoneyPuckLineGameStats.shot_attempts_for,
            MoneyPuckLineGameStats.shot_attempts_against,
            MoneyPuckLineGameStats.high_danger_x_goals_for,
            MoneyPuckLineGameStats.high_danger_x_goals_against,
        )
        .join(MoneyPuckLineGameStats, MoneyPuckLineGameStats.game_id == Game.id)
        .where(Game.season_id.in_(season_ids))
    )
    with engine.connect() as connection:
        return pl.read_database(statement, connection)
