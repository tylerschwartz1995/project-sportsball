"""PostgreSQL integration test for official player season materialization."""

import os
from typing import Any

import pytest
from sqlalchemy import and_, delete, func, select
from test_official_player_seasons import _profile_payload

from sportsball.ingestion.orchestration.official_player_seasons import (
    build_official_player_seasons,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    IngestionRun,
    OfficialGoalieSeasonStats,
    OfficialSkaterSeasonStats,
    Player,
    Season,
    SourcePayload,
    Team,
    TeamSeason,
)

TEST_SEASON_ID = 20992100
TEST_PLAYER_IDS = [960001, 960002]
TEST_TEAM_ID = 770

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_official_player_season_build_is_idempotent() -> None:
    _create_source_data()
    try:
        first = build_official_player_seasons(TEST_SEASON_ID, TEST_SEASON_ID)
        second = build_official_player_seasons(TEST_SEASON_ID, TEST_SEASON_ID)

        assert first.skaters_processed == 1
        assert first.goalies_processed == 1
        assert second.records_processed == 2
        with session_scope() as session:
            assert _count(session, OfficialSkaterSeasonStats) == 1
            assert _count(session, OfficialGoalieSeasonStats) == 1
            skater = session.scalar(
                select(OfficialSkaterSeasonStats).where(
                    OfficialSkaterSeasonStats.season_id == TEST_SEASON_ID
                )
            )
            goalie = session.scalar(
                select(OfficialGoalieSeasonStats).where(
                    OfficialGoalieSeasonStats.season_id == TEST_SEASON_ID
                )
            )
            assert skater is not None
            assert goalie is not None
            assert skater.power_play_points == 8
            assert goalie.save_percentage == 0.915
    finally:
        _clean_up()


def _count(session: Any, model: type[Any]) -> int:
    return (
        session.scalar(
            select(func.count()).select_from(model).where(model.season_id == TEST_SEASON_ID)
        )
        or 0
    )


def _create_source_data() -> None:
    with session_scope() as session:
        season = Season(id=TEST_SEASON_ID, start_year=2099, end_year=2100)
        team = Team(
            nhl_id=TEST_TEAM_ID,
            abbreviation="TSA",
            name="Test Alpha",
        )
        players = [
            Player(nhl_id=TEST_PLAYER_IDS[0], display_name="Test Skater", position="C"),
            Player(nhl_id=TEST_PLAYER_IDS[1], display_name="Test Goalie", position="G"),
        ]
        source_run = IngestionRun(
            job_name="test_official_player_seasons",
            status="succeeded",
            parameters={"test_season": TEST_SEASON_ID},
        )
        session.add_all([season, team, *players, source_run])
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
        session.add_all(
            [
                SourcePayload(
                    ingestion_run_id=source_run.id,
                    provider="nhl",
                    resource_type="player_profile",
                    source_key=str(player_id),
                    checksum=f"{player_id:064d}",
                    payload=_profile_payload(player_id, position),
                )
                for player_id, position in zip(
                    TEST_PLAYER_IDS,
                    ("C", "G"),
                    strict=True,
                )
            ]
        )


def _clean_up() -> None:
    with session_scope() as session:
        session.execute(
            delete(OfficialSkaterSeasonStats).where(
                OfficialSkaterSeasonStats.season_id == TEST_SEASON_ID
            )
        )
        session.execute(
            delete(OfficialGoalieSeasonStats).where(
                OfficialGoalieSeasonStats.season_id == TEST_SEASON_ID
            )
        )
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "player_profile",
                SourcePayload.source_key.in_([str(value) for value in TEST_PLAYER_IDS]),
            )
        )
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                (IngestionRun.parameters["test_season"].as_string() == str(TEST_SEASON_ID))
                | and_(
                    IngestionRun.job_name == "build_official_player_seasons",
                    IngestionRun.parameters["start_season"].as_string() == str(TEST_SEASON_ID),
                )
            )
        ).all()
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        team_ids = select(Team.id).where(Team.nhl_id == TEST_TEAM_ID)
        session.execute(delete(TeamSeason).where(TeamSeason.team_id.in_(team_ids)))
        session.execute(delete(Player).where(Player.nhl_id.in_(TEST_PLAYER_IDS)))
        session.execute(delete(Team).where(Team.nhl_id == TEST_TEAM_ID))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
