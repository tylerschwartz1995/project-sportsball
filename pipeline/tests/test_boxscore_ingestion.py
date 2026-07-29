"""PostgreSQL integration test for idempotent box-score ingestion."""

import json
import os
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.boxscores import ingest_boxscore
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    GoalieGameStats,
    IngestionRun,
    Player,
    PlayerGameStats,
    Season,
    SourcePayload,
    Team,
    TeamGameStats,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "nhl_boxscore_modern.json"
TEST_SEASON_ID = 20962097
TEST_GAME_ID = 2096020001
TEST_TEAM_IDS = [706, 710]
TEST_PLAYER_IDS = [900001, 900002, 900003, 900004]

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_boxscore_ingestion_is_idempotent() -> None:
    payload = json.dumps(_boxscore_payload()).encode()
    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(lambda _request: httpx.Response(200, content=payload)),
        )
    )
    run_ids = []

    _create_game_dimensions()
    try:
        first = ingest_boxscore(TEST_GAME_ID, client)
        second = ingest_boxscore(TEST_GAME_ID, client)
        run_ids.extend([first.run_id, second.run_id])

        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            player_pks = select(Player.id).where(Player.nhl_id.in_(TEST_PLAYER_IDS))
            assert game_pk is not None
            assert session.scalar(select(Game.last_period_type).where(Game.id == game_pk)) == "REG"
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(TeamGameStats)
                    .where(TeamGameStats.game_id == game_pk)
                )
                == 2
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(PlayerGameStats)
                    .where(PlayerGameStats.game_id == game_pk)
                )
                == 2
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(GoalieGameStats)
                    .where(GoalieGameStats.game_id == game_pk)
                )
                == 2
            )
            assert (
                session.scalar(
                    select(func.count()).select_from(Player).where(Player.id.in_(player_pks))
                )
                == 4
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourcePayload)
                    .where(
                        SourcePayload.resource_type == "boxscore",
                        SourcePayload.source_key == str(TEST_GAME_ID),
                    )
                )
                == 1
            )
            runs = session.scalars(select(IngestionRun).where(IngestionRun.id.in_(run_ids))).all()
            assert len(runs) == 2
            assert all(run.status == "succeeded" for run in runs)
            assert all(run.records_processed == 6 for run in runs)
    finally:
        _clean_up(run_ids)


def _boxscore_payload() -> dict[str, Any]:
    payload: dict[str, Any] = json.loads(FIXTURE_PATH.read_text())
    payload["id"] = TEST_GAME_ID
    payload["season"] = TEST_SEASON_ID
    payload["gameDate"] = "2097-01-02"
    payload["startTimeUTC"] = "2097-01-03T00:00:00Z"
    payload["awayTeam"]["id"] = TEST_TEAM_IDS[0]
    payload["homeTeam"]["id"] = TEST_TEAM_IDS[1]
    players = payload["playerByGameStats"]
    players["awayTeam"]["forwards"][0]["playerId"] = TEST_PLAYER_IDS[0]
    players["awayTeam"]["goalies"][0]["playerId"] = TEST_PLAYER_IDS[1]
    players["homeTeam"]["forwards"][0]["playerId"] = TEST_PLAYER_IDS[2]
    players["homeTeam"]["goalies"][0]["playerId"] = TEST_PLAYER_IDS[3]
    return payload


def _create_game_dimensions() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2096, end_year=2097))
        away = Team(
            nhl_id=TEST_TEAM_IDS[0],
            abbreviation="AWY",
            name="Away Test",
        )
        home = Team(
            nhl_id=TEST_TEAM_IDS[1],
            abbreviation="HME",
            name="Home Test",
        )
        session.add_all([away, home])
        session.flush()
        session.add(
            Game(
                nhl_id=TEST_GAME_ID,
                season_id=TEST_SEASON_ID,
                game_type=2,
                game_date=date(2097, 1, 2),
                start_time_utc=datetime(2097, 1, 3, tzinfo=UTC),
                state="OFF",
                away_team_id=away.id,
                home_team_id=home.id,
            )
        )


def _clean_up(run_ids: list[Any]) -> None:
    with session_scope() as session:
        game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
        player_pks = session.scalars(
            select(Player.id).where(Player.nhl_id.in_(TEST_PLAYER_IDS))
        ).all()
        if game_pk is not None:
            session.execute(delete(TeamGameStats).where(TeamGameStats.game_id == game_pk))
            session.execute(delete(PlayerGameStats).where(PlayerGameStats.game_id == game_pk))
            session.execute(delete(GoalieGameStats).where(GoalieGameStats.game_id == game_pk))
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "boxscore",
                SourcePayload.source_key == str(TEST_GAME_ID),
            )
        )
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        if player_pks:
            session.execute(delete(Player).where(Player.id.in_(player_pks)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
