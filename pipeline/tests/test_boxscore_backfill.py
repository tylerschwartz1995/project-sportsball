"""PostgreSQL integration tests for resumable box-score backfills."""

import json
import os
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.boxscore_backfill import backfill_boxscores
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    BoxscoreBackfillGame,
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
TEST_SEASON_ID = 20942095
TEST_GAME_IDS = [2094020001, 2094020002]
TEST_TEAM_IDS = [606, 610]
TEST_PLAYER_IDS = [*range(910001, 910005), *range(920001, 920005)]

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_boxscore_backfill_resumes_and_retries_failures() -> None:
    _create_game_dimensions()
    try:
        first = backfill_boxscores(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
            max_games=1,
        )
        assert first.attempted_this_run == 1
        assert first.completed_games == 1
        assert first.remaining_games == 1

        failed = backfill_boxscores(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(failing_game_id=TEST_GAME_IDS[1]),
        )
        assert failed.attempted_this_run == 1
        assert failed.completed_games == 1
        assert failed.failed_games == 1
        assert [failure.game_id for failure in failed.failures] == [TEST_GAME_IDS[1]]

        skipped_failure = backfill_boxscores(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )
        assert skipped_failure.attempted_this_run == 0
        assert skipped_failure.remaining_games == 1

        retried = backfill_boxscores(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
            retry_failed=True,
        )
        assert retried.attempted_this_run == 1
        assert retried.completed_games == 2
        assert retried.failed_games == 0
        assert retried.remaining_games == 0

        already_complete = backfill_boxscores(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )
        assert already_complete.attempted_this_run == 0

        with session_scope() as session:
            second_game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_IDS[1]))
            status = session.get(BoxscoreBackfillGame, second_game_pk)
            assert status is not None
            assert status.status == "completed"
            assert status.attempt_count == 2
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(TeamGameStats)
                    .join(Game, Game.id == TeamGameStats.game_id)
                    .where(Game.nhl_id.in_(TEST_GAME_IDS))
                )
                == 4
            )
    finally:
        _clean_up()


def _client(*, failing_game_id: int | None = None) -> NhlClient:
    def handler(request: httpx.Request) -> httpx.Response:
        game_id = int(request.url.path.split("/")[-2])
        if game_id == failing_game_id:
            return httpx.Response(404)
        return httpx.Response(200, json=_boxscore_payload(game_id))

    return NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _boxscore_payload(game_id: int) -> dict[str, Any]:
    payload: dict[str, Any] = json.loads(FIXTURE_PATH.read_text())
    game_index = TEST_GAME_IDS.index(game_id)
    payload["id"] = game_id
    payload["season"] = TEST_SEASON_ID
    payload["gameDate"] = f"2095-01-0{game_index + 2}"
    payload["startTimeUTC"] = f"2095-01-0{game_index + 3}T00:00:00Z"
    payload["awayTeam"]["id"] = TEST_TEAM_IDS[0]
    payload["homeTeam"]["id"] = TEST_TEAM_IDS[1]
    players = payload["playerByGameStats"]
    player_ids = TEST_PLAYER_IDS[game_index * 4 : (game_index + 1) * 4]
    players["awayTeam"]["forwards"][0]["playerId"] = player_ids[0]
    players["awayTeam"]["goalies"][0]["playerId"] = player_ids[1]
    players["homeTeam"]["forwards"][0]["playerId"] = player_ids[2]
    players["homeTeam"]["goalies"][0]["playerId"] = player_ids[3]
    return payload


def _create_game_dimensions() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2094, end_year=2095))
        away = Team(nhl_id=TEST_TEAM_IDS[0], abbreviation="AWY", name="Away Test")
        home = Team(nhl_id=TEST_TEAM_IDS[1], abbreviation="HME", name="Home Test")
        session.add_all([away, home])
        session.flush()
        session.add_all(
            [
                Game(
                    nhl_id=game_id,
                    season_id=TEST_SEASON_ID,
                    game_type=2,
                    game_date=date(2095, 1, game_index + 2),
                    start_time_utc=datetime(2095, 1, game_index + 3, tzinfo=UTC),
                    state="OFF",
                    away_team_id=away.id,
                    home_team_id=home.id,
                )
                for game_index, game_id in enumerate(TEST_GAME_IDS)
            ]
        )


def _clean_up() -> None:
    with session_scope() as session:
        game_pks = session.scalars(select(Game.id).where(Game.nhl_id.in_(TEST_GAME_IDS))).all()
        player_pks = session.scalars(
            select(Player.id).where(Player.nhl_id.in_(TEST_PLAYER_IDS))
        ).all()
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.parameters["game_id"]
                .as_string()
                .in_([str(game_id) for game_id in TEST_GAME_IDS])
            )
        ).all()
        if game_pks:
            session.execute(
                delete(BoxscoreBackfillGame).where(BoxscoreBackfillGame.game_id.in_(game_pks))
            )
            session.execute(delete(TeamGameStats).where(TeamGameStats.game_id.in_(game_pks)))
            session.execute(delete(PlayerGameStats).where(PlayerGameStats.game_id.in_(game_pks)))
            session.execute(delete(GoalieGameStats).where(GoalieGameStats.game_id.in_(game_pks)))
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "boxscore",
                SourcePayload.source_key.in_([str(game_id) for game_id in TEST_GAME_IDS]),
            )
        )
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id.in_(TEST_GAME_IDS)))
        if player_pks:
            session.execute(delete(Player).where(Player.id.in_(player_pks)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
