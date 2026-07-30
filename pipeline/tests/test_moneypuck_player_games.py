"""MoneyPuck player-game client, normalization, and persistence tests."""

import hashlib
import os
from datetime import UTC, date, datetime
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_player_games import (
    ingest_moneypuck_player_games,
)
from sportsball.normalization.moneypuck_player_games import (
    moneypuck_player_game_frames,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckGoalieGameStats,
    MoneyPuckSkaterGameStats,
    Player,
    Season,
    SourceArtifact,
    Team,
    TeamSeason,
)

TEST_SEASON_ID = 20992100
TEST_GAME_ID = 2099020001
TEST_TEAM_IDS = [890, 891]
TEST_PLAYER_IDS = [8999001, 8999002]


def test_player_game_client_requests_published_archive() -> None:
    archive = _archive(_skater_csv(), "skaters")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "peter-tanner.com"
        assert request.url.path.endswith("/seasonPlayersSummary/skaters/2099.zip")
        return httpx.Response(
            200,
            content=archive,
            headers={"content-type": "application/zip"},
        )

    client = MoneyPuckClient(
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        request_interval_seconds=0,
    )
    fetched = client.fetch_player_game_archive(2099, "skaters")

    assert fetched.source_key == "2099:regular:skaters_games"
    assert fetched.checksum == hashlib.sha256(archive).hexdigest()


def test_player_game_archives_normalize_five_situations() -> None:
    frames = _frames()

    assert frames.skaters.height == 5
    assert frames.goalies.height == 5
    assert set(frames.skaters["situation"].to_list()) == {
        "all",
        "5on5",
        "5on4",
        "4on5",
        "other",
    }
    assert frames.skaters.row(0, named=True)["canonical_team_abbrev"] == "TSA"
    assert frames.goalies.row(0, named=True)["expected_goals_against"] == 2.4


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)
def test_player_game_ingestion_is_idempotent() -> None:
    _create_dimensions()
    try:
        first = ingest_moneypuck_player_games(TEST_SEASON_ID, _client())
        second = ingest_moneypuck_player_games(TEST_SEASON_ID, _client())

        assert first.records_processed == 10
        assert second.records_processed == 10
        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            assert game_pk is not None
            skaters = session.scalar(
                select(func.count())
                .select_from(MoneyPuckSkaterGameStats)
                .where(MoneyPuckSkaterGameStats.game_id == game_pk)
            )
            goalies = session.scalar(
                select(func.count())
                .select_from(MoneyPuckGoalieGameStats)
                .where(MoneyPuckGoalieGameStats.game_id == game_pk)
            )
            assert skaters == 5
            assert goalies == 5
    finally:
        _clean_up()


def _client() -> MoneyPuckClient:
    skaters = _archive(_skater_csv(), "skaters")
    goalies = _archive(_goalie_csv(), "goalies")

    def handler(request: httpx.Request) -> httpx.Response:
        content = skaters if request.url.path.endswith("/skaters/2099.zip") else goalies
        return httpx.Response(200, content=content)

    return MoneyPuckClient(
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        request_interval_seconds=0,
        max_retries=0,
    )


def _frames():
    return moneypuck_player_game_frames(
        TEST_SEASON_ID,
        skaters_archive=_archive(_skater_csv(), "skaters"),
        goalies_archive=_archive(_goalie_csv(), "goalies"),
    )


def _archive(content: bytes, resource: str) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr(f"nested/{resource}/2099.csv", content)
    return output.getvalue()


def _skater_csv() -> bytes:
    header = (
        "playerId,name,gameId,season,playerTeam,opposingTeam,home_or_away,"
        "gameDate,position,situation,icetime,shifts,gameScore,"
        "onIce_xGoalsPercentage,offIce_xGoalsPercentage,onIce_corsiPercentage,"
        "offIce_corsiPercentage,onIce_fenwickPercentage,offIce_fenwickPercentage,"
        "I_F_xGoals,I_F_goals,I_F_points,I_F_shotAttempts,I_F_primaryAssists,"
        "I_F_secondaryAssists,I_F_shotsOnGoal,I_F_hits,I_F_takeaways,"
        "I_F_giveaways,OnIce_F_xGoals,OnIce_A_xGoals,OnIce_F_goals,OnIce_A_goals"
    )
    rows = [
        (
            f"{TEST_PLAYER_IDS[0]},Test Skater,{TEST_GAME_ID},2099,TSA,TSB,HOME,"
            f"20991001,D,{situation},900,12,1.2,0.55,0.45,0.54,0.46,0.53,"
            "0.47,0.4,1,2,4,1,0,3,2,1,0,1.8,1.2,2,1"
        )
        for situation in ("all", "5on5", "5on4", "4on5", "other")
    ]
    return f"{header}\n{'\n'.join(rows)}\n".encode()


def _goalie_csv() -> bytes:
    header = (
        "playerId,name,gameId,season,playerTeam,opposingTeam,home_or_away,"
        "gameDate,situation,icetime,xGoals,goals,unblocked_shot_attempts,"
        "xRebounds,rebounds,xFreeze,freeze,xOnGoal,ongoal,flurryAdjustedxGoals,"
        "lowDangerxGoals,mediumDangerxGoals,highDangerxGoals"
    )
    rows = [
        (
            f"{TEST_PLAYER_IDS[1]},Test Goalie,{TEST_GAME_ID},2099,TSA,TSB,HOME,"
            f"20991001,{situation},3600,2.4,2,28,3.1,3,5.2,5,26.4,27,2.2,"
            "0.4,0.8,1.2"
        )
        for situation in ("all", "5on5", "5on4", "4on5", "other")
    ]
    return f"{header}\n{'\n'.join(rows)}\n".encode()


def _create_dimensions() -> None:
    with session_scope() as session:
        season = Season(id=TEST_SEASON_ID, start_year=2099, end_year=2100)
        teams = [
            Team(nhl_id=source_id, abbreviation=abbrev, name=f"Test {abbrev}")
            for source_id, abbrev in zip(TEST_TEAM_IDS, ("TSA", "TSB"), strict=True)
        ]
        players = [
            Player(nhl_id=source_id, display_name=f"Test Player {source_id}")
            for source_id in TEST_PLAYER_IDS
        ]
        session.add_all([season, *teams, *players])
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
                delete(MoneyPuckSkaterGameStats).where(MoneyPuckSkaterGameStats.game_id == game_pk)
            )
            session.execute(
                delete(MoneyPuckGoalieGameStats).where(MoneyPuckGoalieGameStats.game_id == game_pk)
            )
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.job_name == "ingest_moneypuck_player_games",
                IngestionRun.parameters["season_id"].as_string() == str(TEST_SEASON_ID),
            )
        ).all()
        if run_ids:
            session.execute(
                delete(SourceArtifact).where(SourceArtifact.ingestion_run_id.in_(run_ids))
            )
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        team_pks = select(Team.id).where(Team.nhl_id.in_(TEST_TEAM_IDS))
        session.execute(delete(TeamSeason).where(TeamSeason.team_id.in_(team_pks)))
        session.execute(delete(Player).where(Player.nhl_id.in_(TEST_PLAYER_IDS)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
