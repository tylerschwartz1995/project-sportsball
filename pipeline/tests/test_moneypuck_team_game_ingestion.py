"""PostgreSQL integration test for MoneyPuck team-game ingestion."""

import os
from datetime import UTC, date, datetime

import httpx
import pytest
from sqlalchemy import delete, func, select
from test_moneypuck_team_games import TEST_GAME_ID, _team_games_csv

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_team_games import (
    ingest_moneypuck_team_games,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckTeamGameStats,
    Season,
    SourceArtifact,
    Team,
    TeamSeason,
)

TEST_SEASON_ID = 20992100
TEST_TEAM_IDS = [790, 791]

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_moneypuck_team_game_ingestion_is_idempotent() -> None:
    _create_dimensions()
    try:
        first = ingest_moneypuck_team_games(TEST_SEASON_ID, TEST_SEASON_ID, _client())
        second = ingest_moneypuck_team_games(TEST_SEASON_ID, TEST_SEASON_ID, _client())

        assert first.rows_processed == 10
        assert second.rows_processed == 10
        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(MoneyPuckTeamGameStats)
                    .where(MoneyPuckTeamGameStats.game_id == game_pk)
                )
                == 10
            )
            artifact_count = session.scalar(
                select(func.count())
                .select_from(SourceArtifact)
                .where(
                    SourceArtifact.provider == "moneypuck",
                    SourceArtifact.source_key == "all:team_games",
                    SourceArtifact.content_length == len(_team_games_csv()),
                )
            )
            assert artifact_count is not None
            assert artifact_count >= 1
    finally:
        _clean_up()


def _client() -> MoneyPuckClient:
    return MoneyPuckClient(
        client=httpx.Client(
            base_url="https://example.test",
            transport=httpx.MockTransport(
                lambda _request: httpx.Response(
                    200,
                    content=_team_games_csv(),
                    headers={"content-type": "text/csv"},
                )
            ),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _create_dimensions() -> None:
    with session_scope() as session:
        season = Season(id=TEST_SEASON_ID, start_year=2099, end_year=2100)
        teams = [
            Team(nhl_id=source_id, abbreviation=abbrev, name=f"Test {abbrev}")
            for source_id, abbrev in zip(TEST_TEAM_IDS, ("TSA", "TSB"), strict=True)
        ]
        session.add_all([season, *teams])
        session.flush()
        session.add_all(
            [
                TeamSeason(
                    team_id=team.id,
                    season_id=TEST_SEASON_ID,
                    abbreviation=team.abbreviation,
                    common_name=team.abbreviation,
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
                game_date=date(2099, 10, 1),
                start_time_utc=datetime(2099, 10, 2, tzinfo=UTC),
                state="OFF",
                away_team_id=teams[1].id,
                home_team_id=teams[0].id,
            )
        )


def _clean_up() -> None:
    with session_scope() as session:
        game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
        if game_pk is not None:
            session.execute(
                delete(MoneyPuckTeamGameStats).where(MoneyPuckTeamGameStats.game_id == game_pk)
            )
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.job_name == "ingest_moneypuck_team_games",
                IngestionRun.parameters["start_season"].as_string() == str(TEST_SEASON_ID),
            )
        ).all()
        session.execute(
            delete(SourceArtifact).where(
                SourceArtifact.provider == "moneypuck",
                SourceArtifact.source_key == "all:team_games",
                SourceArtifact.content_length == len(_team_games_csv()),
            )
        )
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        team_ids = select(Team.id).where(Team.nhl_id.in_(TEST_TEAM_IDS))
        session.execute(delete(TeamSeason).where(TeamSeason.team_id.in_(team_ids)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
