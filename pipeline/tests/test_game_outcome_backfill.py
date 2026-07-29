"""PostgreSQL integration test for retained-payload outcome backfills."""

import os
from datetime import UTC, date, datetime
from typing import Any

import pytest
from sqlalchemy import delete, select

from sportsball.ingestion.orchestration.game_outcomes import backfill_game_outcomes
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    Season,
    SourcePayload,
    Team,
)

TEST_SEASON_ID = 20982099
TEST_GAME_ID = 2098020001
TEST_TEAM_IDS = [730, 731]

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_game_outcomes_backfill_from_retained_payloads() -> None:
    source_run_id = _create_game_and_payload()
    backfill_run_id: Any | None = None
    try:
        result = backfill_game_outcomes(TEST_SEASON_ID, TEST_SEASON_ID)
        backfill_run_id = result.run_id

        assert result.games_processed == 1
        with session_scope() as session:
            assert (
                session.scalar(select(Game.last_period_type).where(Game.nhl_id == TEST_GAME_ID))
                == "SO"
            )
            run = session.get(IngestionRun, result.run_id)
            assert run is not None
            assert run.status == "succeeded"
            assert run.records_processed == 1
    finally:
        _clean_up(source_run_id, backfill_run_id)


def _create_game_and_payload() -> Any:
    with session_scope() as session:
        source_run = IngestionRun(
            job_name="test_source_payload",
            status="succeeded",
            records_processed=1,
        )
        season = Season(id=TEST_SEASON_ID, start_year=2098, end_year=2099)
        teams = [
            Team(nhl_id=source_id, abbreviation=f"O{index}", name=f"Outcome {index}")
            for index, source_id in enumerate(TEST_TEAM_IDS)
        ]
        session.add_all([source_run, season, *teams])
        session.flush()
        session.add(
            Game(
                nhl_id=TEST_GAME_ID,
                season_id=TEST_SEASON_ID,
                game_type=2,
                game_date=date(2098, 10, 1),
                start_time_utc=datetime(2098, 10, 2, tzinfo=UTC),
                state="OFF",
                away_team_id=teams[0].id,
                home_team_id=teams[1].id,
            )
        )
        session.add(
            SourcePayload(
                ingestion_run_id=source_run.id,
                provider="nhl",
                resource_type="boxscore",
                source_key=str(TEST_GAME_ID),
                checksum="a" * 64,
                payload={"gameOutcome": {"lastPeriodType": "SO"}},
            )
        )
        return source_run.id


def _clean_up(source_run_id: Any, backfill_run_id: Any | None) -> None:
    with session_scope() as session:
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "boxscore",
                SourcePayload.source_key == str(TEST_GAME_ID),
            )
        )
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
        run_ids = [source_run_id]
        if backfill_run_id is not None:
            run_ids.append(backfill_run_id)
        session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
