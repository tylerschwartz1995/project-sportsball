"""PostgreSQL integration test for MoneyPuck season ingestion."""

import os
from typing import Any

import httpx
import pytest
from sqlalchemy import delete, func, select
from test_moneypuck_seasons import (
    TEST_GOALIE_ID,
    TEST_SEASON_ID,
    TEST_SKATER_ID,
    _season_csvs,
)

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_season_backfill import (
    backfill_moneypuck_seasons,
)
from sportsball.ingestion.orchestration.moneypuck_seasons import (
    ingest_moneypuck_season,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    IngestionRun,
    MoneyPuckGoalieSeasonStats,
    MoneyPuckSeasonBackfill,
    MoneyPuckSkaterSeasonStats,
    MoneyPuckTeamSeasonStats,
    Player,
    Season,
    SourceArtifact,
    Team,
    TeamSeason,
)

TEST_TEAM_ID = 780

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_moneypuck_season_ingestion_is_idempotent_and_resumable() -> None:
    _create_dimensions()
    try:
        first = ingest_moneypuck_season(TEST_SEASON_ID, _client())
        second = ingest_moneypuck_season(TEST_SEASON_ID, _client())
        resumed = backfill_moneypuck_seasons(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )

        assert first.records_processed == 15
        assert second.records_processed == 15
        assert resumed.attempted_this_run == 0
        assert resumed.completed_seasons == 1
        with session_scope() as session:
            assert _count(session, MoneyPuckSkaterSeasonStats) == 5
            assert _count(session, MoneyPuckGoalieSeasonStats) == 5
            assert _count(session, MoneyPuckTeamSeasonStats) == 5
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourceArtifact)
                    .where(
                        SourceArtifact.provider == "moneypuck",
                        SourceArtifact.source_key.like("2099:regular:%"),
                    )
                )
                == 3
            )
    finally:
        _clean_up()


def _client() -> MoneyPuckClient:
    csvs = _season_csvs()

    def handler(request: httpx.Request) -> httpx.Response:
        resource_type = request.url.path.rsplit("/", maxsplit=1)[-1].removesuffix(".csv")
        return httpx.Response(
            200,
            content=csvs[resource_type],
            headers={"content-type": "text/csv"},
        )

    return MoneyPuckClient(
        client=httpx.Client(
            base_url="https://example.test",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _count(session: Any, model: type[Any]) -> int:
    return (
        session.scalar(
            select(func.count()).select_from(model).where(model.season_id == TEST_SEASON_ID)
        )
        or 0
    )


def _create_dimensions() -> None:
    with session_scope() as session:
        season = Season(id=TEST_SEASON_ID, start_year=2099, end_year=2100)
        team = Team(nhl_id=TEST_TEAM_ID, abbreviation="TSA", name="Test Alpha")
        players = [
            Player(nhl_id=TEST_SKATER_ID, display_name="Test Skater", position="C"),
            Player(nhl_id=TEST_GOALIE_ID, display_name="Test Goalie", position="G"),
        ]
        session.add_all([season, team, *players])
        session.flush()
        session.add(
            TeamSeason(
                team_id=team.id,
                season_id=TEST_SEASON_ID,
                abbreviation="TSA",
                common_name="Alpha",
                full_name="Test Alpha",
            )
        )


def _clean_up() -> None:
    with session_scope() as session:
        for model in (
            MoneyPuckSkaterSeasonStats,
            MoneyPuckGoalieSeasonStats,
            MoneyPuckTeamSeasonStats,
        ):
            session.execute(delete(model).where(model.season_id == TEST_SEASON_ID))
        session.execute(
            delete(MoneyPuckSeasonBackfill).where(
                MoneyPuckSeasonBackfill.season_id == TEST_SEASON_ID
            )
        )
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.parameters["season_id"].as_string() == str(TEST_SEASON_ID)
            )
        ).all()
        session.execute(
            delete(SourceArtifact).where(
                SourceArtifact.provider == "moneypuck",
                SourceArtifact.source_key.like("2099:regular:%"),
            )
        )
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        team_ids = select(Team.id).where(Team.nhl_id == TEST_TEAM_ID)
        session.execute(delete(TeamSeason).where(TeamSeason.team_id.in_(team_ids)))
        session.execute(delete(Player).where(Player.nhl_id.in_([TEST_SKATER_ID, TEST_GOALIE_ID])))
        session.execute(delete(Team).where(Team.nhl_id == TEST_TEAM_ID))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
