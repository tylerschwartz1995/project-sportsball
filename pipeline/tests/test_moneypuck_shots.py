"""MoneyPuck shot client, normalization, and persistence tests."""

import os
from datetime import UTC, date, datetime
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_shots import (
    ingest_moneypuck_shots,
)
from sportsball.normalization.moneypuck_shots import moneypuck_shot_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckShot,
    Player,
    Season,
    SourceArtifact,
    Team,
    TeamSeason,
)

TEST_SEASON_ID = 20992100
TEST_GAME_ID = 2099020001
TEST_TEAM_IDS = [990, 991]
TEST_PLAYER_IDS = [9999001, 9999002]


def test_shot_client_requests_published_archive() -> None:
    archive = _archive()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/moneypuck/downloads/shots_2099.zip")
        return httpx.Response(200, content=archive)

    client = MoneyPuckClient(
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        request_interval_seconds=0,
    )
    fetched = client.fetch_shot_archive(2099)

    assert fetched.source_key == "2099:shots"
    assert fetched.content == archive


def test_shot_archive_normalizes_modeled_events() -> None:
    frame = moneypuck_shot_frame(TEST_SEASON_ID, _archive())

    assert frame.height == 3
    assert set(frame["event_type"].to_list()) == {"shot", "miss", "goal"}
    goal = frame.filter(frame["is_goal"]).row(0, named=True)
    assert goal["source_game_id"] == TEST_GAME_ID
    assert goal["x_goal"] == 0.25
    assert goal["canonical_team_abbrev"] == "TSA"


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)
def test_shot_ingestion_is_idempotent() -> None:
    _create_dimensions()
    try:
        first = ingest_moneypuck_shots(TEST_SEASON_ID, _client())
        second = ingest_moneypuck_shots(TEST_SEASON_ID, _client())

        assert first.rows_processed == 3
        assert second.rows_processed == 3
        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            count = session.scalar(
                select(func.count())
                .select_from(MoneyPuckShot)
                .where(MoneyPuckShot.game_id == game_pk)
            )
            assert count == 3
    finally:
        _clean_up()


def _client() -> MoneyPuckClient:
    return MoneyPuckClient(
        client=httpx.Client(
            transport=httpx.MockTransport(lambda _request: httpx.Response(200, content=_archive()))
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _archive() -> bytes:
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr("shots_2099.csv", _csv())
    return output.getvalue()


def _csv() -> bytes:
    header = (
        "shotID,id,game_id,season,event,period,time,teamCode,homeTeamCode,"
        "awayTeamCode,isHomeTeam,isPlayoffGame,shooterPlayerId,goalieIdForShot,"
        "goal,shotWasOnGoal,shotType,location,xCord,yCord,xCordAdjusted,"
        "yCordAdjusted,shotDistance,shotAngle,xGoal,xRebound,xFroze,"
        "xShotWasOnGoal,xPlayStopped,xPlayContinuedInZone,"
        "xPlayContinuedOutsideZone,shotGeneratedRebound,shotRebound,shotRush,"
        "offWing,shotOnEmptyNet,homeSkatersOnIce,awaySkatersOnIce,"
        "homeTeamGoals,awayTeamGoals,timeSinceLastEvent,distanceFromLastEvent"
    )
    rows = []
    for index, event in enumerate(("SHOT", "MISS", "GOAL")):
        goal = int(event == "GOAL")
        on_goal = int(event != "MISS")
        source_event_index = 10 if index < 2 else 12
        goalie_id = "" if event == "MISS" else str(TEST_PLAYER_IDS[1])
        rows.append(
            f"{index},{source_event_index},20001,2099,{event},1,{index + 20},TSA,TSA,"
            f"TSB,1,0,{TEST_PLAYER_IDS[0]},{goalie_id},{goal},"
            f"{on_goal},WRIST,HOMEZONE,70,5,70,5,19,15,0.25,0.1,0.2,0.8,"
            "0.1,0.4,0.2,0,0,1,0,0,5,5,1,0,3,12.5"
        )
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
            session.execute(delete(MoneyPuckShot).where(MoneyPuckShot.game_id == game_pk))
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.job_name == "ingest_moneypuck_shots",
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
