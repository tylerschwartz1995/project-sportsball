"""Contract and normalization tests for NHL schedules."""

import hashlib
from datetime import date
from pathlib import Path

import httpx
import polars as pl

from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.schemas import ScheduleResponse
from sportsball.normalization.games import schedule_games_frame

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "nhl_schedule.json"


def test_schedule_payload_normalizes_to_polars() -> None:
    schedule = ScheduleResponse.model_validate_json(FIXTURE_PATH.read_bytes())

    frame = schedule_games_frame(schedule)

    assert frame.shape == (1, 12)
    assert frame["source_game_id"].item() == 2025020600
    assert frame["home_team_abbrev"].item() == "TOR"
    assert frame["home_team_name"].item() == "Maple Leafs"
    assert frame.schema["game_date"] == pl.Date


def test_client_requests_expected_schedule_endpoint() -> None:
    fixture = FIXTURE_PATH.read_bytes()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/schedule/2026-01-02"
        return httpx.Response(200, content=fixture)

    transport = httpx.MockTransport(handler)
    http_client = httpx.Client(
        base_url="https://example.test/v1",
        transport=transport,
    )

    client = NhlClient(client=http_client)
    fetched = client.fetch_schedule(date(2026, 1, 2))

    assert fetched.schedule.number_of_games == 1
    assert fetched.schedule.next_start_date == date(2026, 1, 9)
    assert fetched.payload["numberOfGames"] == 1
    assert fetched.checksum == hashlib.sha256(fixture).hexdigest()


def test_client_retries_transient_responses() -> None:
    fixture = FIXTURE_PATH.read_bytes()
    attempts = 0

    def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(503)
        return httpx.Response(200, content=fixture)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
        retry_backoff_seconds=0,
    )

    schedule = client.get_schedule(date(2026, 1, 2))

    assert schedule.number_of_games == 1
    assert attempts == 2
