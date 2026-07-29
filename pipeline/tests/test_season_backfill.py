"""Tests for resumable full-season schedule backfills."""

import json
import os
from datetime import date
from pathlib import Path
from typing import Any

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.season_backfill import backfill_season_schedule
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    IngestionRun,
    ScheduleBackfillCheckpoint,
    Season,
    SourcePayload,
    Team,
    TeamSeason,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "nhl_schedule.json"
TEST_SEASON_ID = 20992100
TEST_GAME_IDS = [2099020001, 2099020002]
TEST_TEAM_IDS = [906, 910]
TEST_DATES = ["2100-01-02", "2100-01-09"]

requires_database = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


@requires_database
def test_season_backfill_resumes_from_its_checkpoint() -> None:
    requested_paths: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested_paths.append(request.url.path)
        anchor = request.url.path.endswith("/2099-10-01")
        first_page = request.url.path.endswith("/2100-01-02")
        payload = _schedule_payload(
            game_id=TEST_GAME_IDS[0] if anchor or first_page else TEST_GAME_IDS[1],
            game_date=TEST_DATES[0] if anchor or first_page else TEST_DATES[1],
            next_date=TEST_DATES[1] if anchor or first_page else "2100-01-16",
        )
        return httpx.Response(200, json=payload)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
    )

    try:
        paused = backfill_season_schedule(TEST_SEASON_ID, client, max_requests=1)
        completed = backfill_season_schedule(TEST_SEASON_ID, client)
        already_completed = backfill_season_schedule(TEST_SEASON_ID, client)

        assert paused.status == "paused"
        assert paused.next_date == date(2100, 1, 9)
        assert completed.status == "completed"
        assert completed.requests_completed == 2
        assert completed.games_processed == 2
        assert already_completed == completed
        assert requested_paths == [
            "/v1/schedule/2099-10-01",
            "/v1/schedule/2100-01-02",
            "/v1/schedule/2100-01-09",
        ]

        with session_scope() as session:
            assert (
                session.scalar(
                    select(func.count()).select_from(Game).where(Game.nhl_id.in_(TEST_GAME_IDS))
                )
                == 2
            )
    finally:
        _clean_up_backfill_records()


def test_season_backfill_rejects_invalid_season_ids() -> None:
    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(lambda _request: httpx.Response(500)),
        )
    )

    with pytest.raises(ValueError, match="NHL format"):
        backfill_season_schedule(20042004, client)


def _schedule_payload(*, game_id: int, game_date: str, next_date: str) -> dict[str, Any]:
    payload: dict[str, Any] = json.loads(FIXTURE_PATH.read_text())
    payload["nextStartDate"] = next_date
    payload["regularSeasonStartDate"] = TEST_DATES[0]
    payload["regularSeasonEndDate"] = TEST_DATES[1]
    payload["playoffEndDate"] = "2100-01-10"
    game_day = payload["gameWeek"][0]
    game_day["date"] = game_date
    game = game_day["games"][0]
    game["id"] = game_id
    game["season"] = TEST_SEASON_ID
    game["startTimeUTC"] = f"{game_date}T19:00:00Z"
    game["awayTeam"]["id"] = TEST_TEAM_IDS[0]
    game["homeTeam"]["id"] = TEST_TEAM_IDS[1]
    return payload


def _clean_up_backfill_records() -> None:
    with session_scope() as session:
        run_ids = session.scalars(
            select(SourcePayload.ingestion_run_id).where(SourcePayload.source_key.in_(TEST_DATES))
        ).all()
        session.execute(delete(SourcePayload).where(SourcePayload.source_key.in_(TEST_DATES)))
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id.in_(TEST_GAME_IDS)))
        session.execute(delete(TeamSeason).where(TeamSeason.season_id == TEST_SEASON_ID))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
        session.execute(
            delete(ScheduleBackfillCheckpoint).where(
                ScheduleBackfillCheckpoint.season_id == TEST_SEASON_ID
            )
        )
