"""PostgreSQL integration tests for official standings ingestion."""

import os
from datetime import UTC, date, datetime

import httpx
import pytest
from sqlalchemy import delete, func, select
from test_nhl_standings import _standings_payload

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.standings import ingest_standings
from sportsball.ingestion.orchestration.standings_backfill import (
    backfill_final_standings,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    OfficialStandingsSnapshot,
    Season,
    SourcePayload,
    Team,
    TeamSeason,
)

TEST_SEASON_ID = 20992100
TEST_GAME_ID = 2099020999
TEST_TEAM_IDS = [760, 761]
TEST_DATE = date(2100, 4, 10)

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_official_standings_ingestion_is_idempotent_and_audited() -> None:
    _create_dimensions()
    try:
        first = ingest_standings(TEST_DATE, _client())
        second = ingest_standings(TEST_DATE, _client())

        assert first.teams_processed == 2
        assert second.teams_processed == 2
        with session_scope() as session:
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(OfficialStandingsSnapshot)
                    .where(OfficialStandingsSnapshot.snapshot_date == TEST_DATE)
                )
                == 2
            )
            leader = session.scalar(
                select(OfficialStandingsSnapshot).where(
                    OfficialStandingsSnapshot.snapshot_date == TEST_DATE,
                    OfficialStandingsSnapshot.league_rank == 1,
                )
            )
            assert leader is not None
            assert leader.points == 124
            assert leader.regulation_plus_overtime_wins == 54
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourcePayload)
                    .where(
                        SourcePayload.resource_type == "standings",
                        SourcePayload.source_key == TEST_DATE.isoformat(),
                    )
                )
                == 1
            )
    finally:
        _clean_up()


def test_final_standings_backfill_resumes_from_stored_snapshot() -> None:
    _create_dimensions()
    try:
        first = backfill_final_standings(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )
        second = backfill_final_standings(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )

        assert first.attempted_this_run == 1
        assert first.completed_seasons == 1
        assert second.attempted_this_run == 0
        assert second.completed_seasons == 1
    finally:
        _clean_up()


def _client() -> NhlClient:
    return NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(
                lambda _request: httpx.Response(200, json=_standings_payload())
            ),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _create_dimensions() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2099, end_year=2100))
        teams = [
            Team(
                nhl_id=source_id,
                abbreviation=abbrev,
                name=name,
            )
            for source_id, abbrev, name in zip(
                TEST_TEAM_IDS,
                ("TSA", "TSB"),
                ("Test Alpha", "Test Beta"),
                strict=True,
            )
        ]
        session.add_all(teams)
        session.flush()
        session.add_all(
            [
                TeamSeason(
                    team_id=team.id,
                    season_id=TEST_SEASON_ID,
                    abbreviation=team.abbreviation,
                    common_name=team.name.split()[-1],
                    full_name=team.name,
                )
                for team in teams
            ]
        )
        session.add(
            Game(
                nhl_id=TEST_GAME_ID,
                season_id=TEST_SEASON_ID,
                game_type=2,
                game_date=TEST_DATE,
                start_time_utc=datetime(2100, 4, 11, tzinfo=UTC),
                state="OFF",
                away_team_id=teams[0].id,
                home_team_id=teams[1].id,
            )
        )


def _clean_up() -> None:
    with session_scope() as session:
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.parameters["snapshot_date"].as_string() == TEST_DATE.isoformat()
            )
        ).all()
        session.execute(
            delete(OfficialStandingsSnapshot).where(
                OfficialStandingsSnapshot.snapshot_date == TEST_DATE
            )
        )
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "standings",
                SourcePayload.source_key == TEST_DATE.isoformat(),
            )
        )
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        team_ids = select(Team.id).where(Team.nhl_id.in_(TEST_TEAM_IDS))
        session.execute(delete(TeamSeason).where(TeamSeason.team_id.in_(team_ids)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
