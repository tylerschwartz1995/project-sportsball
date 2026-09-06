"""Transactional storage boundary for reusable descriptive analytics."""

import uuid
from typing import Any

import polars as pl
from sqlalchemy import delete, insert, text
from sqlalchemy.orm import Session

from sportsball.analytics.history import DEFINITION_VERSION as HISTORY_VERSION
from sportsball.analytics.history import era_rates, peak_windows
from sportsball.analytics.schedule import DEFINITION_VERSION as SCHEDULE_VERSION
from sportsball.analytics.schedule import schedule_context
from sportsball.persistence.models import (
    HistoricalEraRate,
    HistoricalPeakStats,
    ScheduleGameContext,
)


def _read(session: Session, sql: str) -> pl.DataFrame:
    return pl.DataFrame(
        [dict(row) for row in session.execute(text(sql)).mappings()], infer_schema_length=None
    )


def _replace(
    session: Session, model: Any, rows: list[dict[str, Any]], run_id: uuid.UUID, version: str
) -> int:
    session.execute(delete(model))
    for start in range(0, len(rows), 1000):
        session.execute(
            insert(model),
            [
                {**row, "ingestion_run_id": run_id, "definition_version": version}
                for row in rows[start : start + 1000]
            ],
        )
    return len(rows)


def refresh_history(session: Session, run_id: uuid.UUID) -> int:
    """Rebuild complete windows, including windows crossing an ingested range."""
    session.execute(text("SELECT pg_advisory_xact_lock(73120401)"))
    skaters = _read(session, "SELECT * FROM historical_skater_season_stats")
    goalies = _read(session, "SELECT * FROM historical_goalie_season_stats")
    peaks = peak_windows(skaters, "skaters") + peak_windows(goalies, "goalies")
    return _replace(
        session, HistoricalEraRate, era_rates(skaters, goalies), run_id, HISTORY_VERSION
    ) + _replace(session, HistoricalPeakStats, peaks, run_id, HISTORY_VERSION)


def refresh_schedule(session: Session, run_id: uuid.UUID) -> int:
    """Rebuild all seasons so corrections also reach next-season fallbacks."""
    session.execute(text("SELECT pg_advisory_xact_lock(73120402)"))
    games = _read(
        session,
        """
        SELECT game.*, home.score AS home_score, away.score AS away_score
        FROM games AS game
        LEFT JOIN team_game_stats AS home
          ON home.game_id = game.id AND home.team_id = game.home_team_id
        LEFT JOIN team_game_stats AS away
          ON away.game_id = game.id AND away.team_id = game.away_team_id
        WHERE game.game_type = 2
    """,
    )
    advanced = _read(
        session,
        """
        SELECT game_id, team_id, situation, x_goals_for, x_goals_against
        FROM moneypuck_team_game_stats WHERE situation = '5on5'
    """,
    )
    seasons = list(session.execute(text("SELECT id FROM seasons ORDER BY id")).scalars())
    return _replace(
        session,
        ScheduleGameContext,
        schedule_context(games, advanced, seasons),
        run_id,
        SCHEDULE_VERSION,
    )
