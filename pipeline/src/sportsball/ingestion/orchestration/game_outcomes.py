"""Backfill canonical game outcomes from retained NHL boxscore payloads."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import polars as pl
from sqlalchemy import String, bindparam, cast, func, select, update
from sqlalchemy.orm import Session

from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.persistence.database import engine, session_scope
from sportsball.persistence.models import Game, IngestionRun, SourcePayload

NHL_SEASON_GAME_TYPES = (2, 3)
OUTCOME_TYPES = ("REG", "OT", "SO")
UPDATE_BATCH_SIZE = 1_000


@dataclass(frozen=True)
class GameOutcomeBackfillResult:
    """Summary of one retained-payload outcome backfill."""

    run_id: uuid.UUID
    start_season: int
    end_season: int
    games_processed: int


def backfill_game_outcomes(
    start_season: int,
    end_season: int,
) -> GameOutcomeBackfillResult:
    """Populate game ending types without reacquiring NHL data."""
    season_ids = season_ids_in_range(start_season, end_season)
    with session_scope() as session:
        run = IngestionRun(
            job_name="backfill_game_outcomes",
            status="running",
            parameters={"start_season": start_season, "end_season": end_season},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        outcomes = _load_outcomes(season_ids)
        with session_scope() as session:
            expected_games = session.scalar(
                select(func.count())
                .select_from(Game)
                .where(
                    Game.season_id.in_(season_ids),
                    Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                )
            )
            if outcomes.height != (expected_games or 0):
                raise ValueError(
                    f"found outcomes for {outcomes.height} of {expected_games or 0} games"
                )
            _update_outcomes(session, outcomes)
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=outcomes.height,
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

    return GameOutcomeBackfillResult(
        run_id=run_id,
        start_season=start_season,
        end_season=end_season,
        games_processed=outcomes.height,
    )


def _load_outcomes(season_ids: list[int]) -> pl.DataFrame:
    query = (
        select(
            Game.id.label("game_id"),
            SourcePayload.payload["gameOutcome"]["lastPeriodType"]
            .as_string()
            .label("last_period_type"),
            SourcePayload.fetched_at,
        )
        .join(
            SourcePayload,
            (SourcePayload.resource_type == "boxscore")
            & (SourcePayload.source_key == cast(Game.nhl_id, String)),
        )
        .where(
            Game.season_id.in_(season_ids),
            Game.game_type.in_(NHL_SEASON_GAME_TYPES),
        )
    )
    with engine.connect() as connection:
        frame = pl.read_database(query, connection)

    outcomes = (
        frame.sort("fetched_at")
        .unique(subset=["game_id"], keep="last")
        .select("game_id", "last_period_type")
        .sort("game_id")
    )
    invalid = outcomes.filter(~pl.col("last_period_type").is_in(OUTCOME_TYPES).fill_null(False))
    if invalid.height:
        raise ValueError(f"found {invalid.height} games with unsupported outcomes")
    return outcomes


def _update_outcomes(session: Session, outcomes: pl.DataFrame) -> None:
    rows = [
        {"game_pk": row["game_id"], "outcome_type": row["last_period_type"]}
        for row in outcomes.to_dicts()
    ]
    statement = (
        update(Game)
        .where(Game.id == bindparam("game_pk"))
        .values(last_period_type=bindparam("outcome_type"))
    )
    for offset in range(0, len(rows), UPDATE_BATCH_SIZE):
        session.connection().execute(
            statement,
            rows[offset : offset + UPDATE_BATCH_SIZE],
        )
