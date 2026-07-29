"""PostgreSQL integration test for idempotent play-by-play ingestion."""

import json
import os
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.play_by_play import ingest_play_by_play
from sportsball.ingestion.orchestration.play_by_play_backfill import (
    backfill_play_by_play,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    GameEvent,
    GameEventPlayer,
    IngestionRun,
    PlayByPlayBackfillGame,
    Player,
    Season,
    SourcePayload,
    Team,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "nhl_play_by_play_modern.json"
TEST_SEASON_ID = 20992100
TEST_GAME_ID = 2099020001
TEST_TEAM_IDS = [740, 741]
TEST_PLAYER_IDS = [940001, 940002, 940003, 940004, 940005]

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_play_by_play_ingestion_is_idempotent() -> None:
    payload = json.dumps(_play_by_play_payload()).encode()
    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(lambda _request: httpx.Response(200, content=payload)),
        )
    )
    run_ids = []

    _create_game_dimensions()
    try:
        first = ingest_play_by_play(TEST_GAME_ID, client)
        second = ingest_play_by_play(TEST_GAME_ID, client)
        run_ids.extend([first.run_id, second.run_id])

        assert first.events_processed == 4
        assert first.participants_processed == 8
        assert second.events_processed == 4

        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            assert game_pk is not None
            event_ids = select(GameEvent.id).where(GameEvent.game_id == game_pk)
            assert (
                session.scalar(
                    select(func.count()).select_from(GameEvent).where(GameEvent.game_id == game_pk)
                )
                == 4
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(GameEventPlayer)
                    .where(GameEventPlayer.game_event_id.in_(event_ids))
                )
                == 8
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourcePayload)
                    .where(
                        SourcePayload.resource_type == "play_by_play",
                        SourcePayload.source_key == str(TEST_GAME_ID),
                    )
                )
                == 1
            )
            runs = session.scalars(select(IngestionRun).where(IngestionRun.id.in_(run_ids))).all()
            assert len(runs) == 2
            assert all(run.status == "succeeded" for run in runs)
            assert all(run.records_processed == 12 for run in runs)
    finally:
        _clean_up(run_ids)


def test_play_by_play_backfill_parks_and_retries_failure() -> None:
    _create_game_dimensions()
    try:
        failed = backfill_play_by_play(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(fail=True),
        )
        assert failed.attempted_this_run == 1
        assert failed.completed_games == 0
        assert failed.failed_games == 1

        skipped = backfill_play_by_play(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )
        assert skipped.attempted_this_run == 0
        assert skipped.pending_games == 0

        retried = backfill_play_by_play(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
            retry_failed=True,
        )
        assert retried.attempted_this_run == 1
        assert retried.completed_games == 1
        assert retried.failed_games == 0

        complete = backfill_play_by_play(
            TEST_SEASON_ID,
            TEST_SEASON_ID,
            _client(),
        )
        assert complete.attempted_this_run == 0

        with session_scope() as session:
            game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
            status = session.get(PlayByPlayBackfillGame, game_pk)
            assert status is not None
            assert status.status == "completed"
            assert status.attempt_count == 2
    finally:
        _clean_up([])


def _client(*, fail: bool = False) -> NhlClient:
    payload = _play_by_play_payload()
    return NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(
                lambda _request: httpx.Response(404) if fail else httpx.Response(200, json=payload)
            ),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _play_by_play_payload() -> dict[str, Any]:
    payload: dict[str, Any] = json.loads(FIXTURE_PATH.read_text())
    payload["id"] = TEST_GAME_ID
    payload["season"] = TEST_SEASON_ID
    payload["gameDate"] = "2100-01-02"
    source_team_ids = [16, 13]
    source_player_ids = [8483493, 8477479, 8476882, 8475683, 8482113]
    team_mapping = dict(zip(source_team_ids, TEST_TEAM_IDS, strict=True))
    player_mapping = dict(zip(source_player_ids, TEST_PLAYER_IDS, strict=True))
    player_fields = {
        "scoringPlayerId",
        "assist1PlayerId",
        "assist2PlayerId",
        "shootingPlayerId",
        "goalieInNetId",
        "committedByPlayerId",
        "drawnByPlayerId",
    }
    for spot in payload["rosterSpots"]:
        spot["teamId"] = team_mapping[spot["teamId"]]
        spot["playerId"] = player_mapping[spot["playerId"]]
    for play in payload["plays"]:
        details = play.get("details", {})
        if "eventOwnerTeamId" in details:
            details["eventOwnerTeamId"] = team_mapping[details["eventOwnerTeamId"]]
        for field in player_fields & details.keys():
            details[field] = player_mapping[details[field]]
    return payload


def _create_game_dimensions() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2099, end_year=2100))
        away = Team(nhl_id=TEST_TEAM_IDS[0], abbreviation="PBA", name="PBP Away")
        home = Team(nhl_id=TEST_TEAM_IDS[1], abbreviation="PBH", name="PBP Home")
        session.add_all([away, home])
        session.flush()
        session.add(
            Game(
                nhl_id=TEST_GAME_ID,
                season_id=TEST_SEASON_ID,
                game_type=2,
                game_date=date(2100, 1, 2),
                start_time_utc=datetime(2100, 1, 3, tzinfo=UTC),
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
        recorded_run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.parameters["game_id"].as_string() == str(TEST_GAME_ID)
            )
        ).all()
        if game_pk is not None:
            session.execute(
                delete(PlayByPlayBackfillGame).where(PlayByPlayBackfillGame.game_id == game_pk)
            )
            session.execute(delete(GameEvent).where(GameEvent.game_id == game_pk))
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "play_by_play",
                SourcePayload.source_key == str(TEST_GAME_ID),
            )
        )
        all_run_ids = {*run_ids, *recorded_run_ids}
        if all_run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(all_run_ids)))
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        if player_pks:
            session.execute(delete(Player).where(Player.id.in_(player_pks)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
