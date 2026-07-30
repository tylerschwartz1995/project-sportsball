"""MoneyPuck line/pairing normalization and persistence tests."""

import os
from datetime import UTC, date, datetime
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_lines import ingest_moneypuck_lines
from sportsball.normalization.moneypuck_lines import moneypuck_line_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    MoneyPuckLineGameStats,
    MoneyPuckUnitSeasonStats,
    Player,
    Season,
    SourceArtifact,
    Team,
    TeamSeason,
)

TEST_SEASON_ID = 20992100
TEST_GAME_ID = 2099020001
TEST_TEAM_IDS = [690, 691]
TEST_PLAYER_IDS = [8999001, 8999002, 8999003]
OMITTED_PLAYER_ID = 8482116


def test_line_archive_normalizes_lines_and_pairings() -> None:
    frame = moneypuck_line_frame(TEST_SEASON_ID, _archive())

    assert frame.height == 3
    assert set(frame["unit_type"].to_list()) == {"line", "pairing"}
    line = frame.filter(frame["name"] == "One-Two-Three").row(0, named=True)
    pairing = frame.filter(frame["unit_type"] == "pairing").row(0, named=True)
    assert line["source_player_3_id"] == TEST_PLAYER_IDS[2]
    assert pairing["source_player_3_id"] is None
    omitted = frame.filter(frame["name"] == "Stutzle-One-Two").row(0, named=True)
    assert omitted["source_player_3_id"] == OMITTED_PLAYER_ID


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)
def test_line_ingestion_is_idempotent() -> None:
    _create_dimensions()
    try:
        first = ingest_moneypuck_lines(TEST_SEASON_ID, _client())
        second = ingest_moneypuck_lines(TEST_SEASON_ID, _client())

        assert first.rows_processed == 2
        assert second.rows_processed == 2
        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            count = session.scalar(
                select(func.count())
                .select_from(MoneyPuckLineGameStats)
                .where(MoneyPuckLineGameStats.game_id == game_pk)
            )
            assert count == 2
            rows = session.scalars(
                select(MoneyPuckLineGameStats).where(MoneyPuckLineGameStats.game_id == game_pk)
            ).all()
            assert all(row.is_home for row in rows)
            assert len({row.opponent_team_id for row in rows}) == 1
            season_units = session.scalars(
                select(MoneyPuckUnitSeasonStats).where(
                    MoneyPuckUnitSeasonStats.season_id == TEST_SEASON_ID
                )
            ).all()
            assert len(season_units) == 2
            assert {unit.unit_type for unit in season_units} == {"line", "pairing"}
            assert all(unit.games_played == 1 for unit in season_units)
    finally:
        _clean_up()


def _client() -> MoneyPuckClient:
    return MoneyPuckClient(
        client=httpx.Client(
            transport=httpx.MockTransport(
                lambda request: (
                    httpx.Response(200, content=_archive(include_omitted=False))
                    if request.url.path.endswith("/lines/2099.zip")
                    else httpx.Response(404)
                )
            )
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _archive(*, include_omitted: bool = True) -> bytes:
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr(
            "nested/lines/2099.csv",
            _csv(include_omitted=include_omitted),
        )
    return output.getvalue()


def _csv(*, include_omitted: bool) -> bytes:
    header = (
        "lineId,name,gameId,season,playerTeam,opposingTeam,home_or_away,"
        "gameDate,position,situation,icetime,iceTimeRank,xGoalsPercentage,"
        "corsiPercentage,fenwickPercentage,xGoalsFor,xGoalsAgainst,goalsFor,"
        "goalsAgainst,shotsOnGoalFor,shotsOnGoalAgainst,shotAttemptsFor,"
        "shotAttemptsAgainst,scoreVenueAdjustedxGoalsFor,"
        "scoreVenueAdjustedxGoalsAgainst,highDangerxGoalsFor,"
        "highDangerxGoalsAgainst,totalShotCreditFor,totalShotCreditAgainst"
    )
    line_id = "".join(str(player_id) for player_id in TEST_PLAYER_IDS)
    pairing_id = "".join(str(player_id) for player_id in TEST_PLAYER_IDS[:2])
    metrics = "600,1,0.55,0.54,0.53,1.5,1.2,2,1,12,10,25,20,1.6,1.3,0.8,0.6,1.7,1.4"
    rows = [
        f"{line_id},One-Two-Three,{TEST_GAME_ID},2099,TSA,TSB,HOME,20991001,line,5on5,{metrics}",
        f"{pairing_id},One-Two,{TEST_GAME_ID},2099,TSA,TSA,AWAY,20991001,pairing,5on5,{metrics}",
    ]
    if include_omitted:
        rows.append(
            f"{pairing_id},Stutzle-One-Two,{TEST_GAME_ID},2099,TSA,TSB,HOME,20991001,line,5on5,{metrics}"
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
        session.execute(
            delete(MoneyPuckUnitSeasonStats).where(
                MoneyPuckUnitSeasonStats.season_id == TEST_SEASON_ID
            )
        )
        game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
        if game_pk is not None:
            session.execute(
                delete(MoneyPuckLineGameStats).where(MoneyPuckLineGameStats.game_id == game_pk)
            )
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.job_name == "ingest_moneypuck_lines",
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
