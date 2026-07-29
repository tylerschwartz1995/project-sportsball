"""Historical and modern NHL play-by-play contract tests."""

import hashlib
from pathlib import Path

import httpx
import polars as pl
import pytest

from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.schemas import PlayByPlayResponse
from sportsball.normalization.play_by_play import play_by_play_frames

FIXTURE_DIR = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize(
    ("fixture_name", "expected_game_id", "expected_events"),
    [
        ("nhl_play_by_play_2005.json", 2005020001, 3),
        ("nhl_play_by_play_modern.json", 2025020001, 4),
    ],
)
def test_historical_and_modern_play_by_play_normalize(
    fixture_name: str,
    expected_game_id: int,
    expected_events: int,
) -> None:
    response = PlayByPlayResponse.model_validate_json((FIXTURE_DIR / fixture_name).read_bytes())

    normalized = play_by_play_frames(response)

    assert normalized.source_game_id == expected_game_id
    assert normalized.roster.height == 5
    assert normalized.events.height == expected_events
    assert normalized.participants.height >= 7
    assert normalized.events["sort_order"].is_sorted()


def test_historical_events_preserve_missing_coordinates() -> None:
    response = PlayByPlayResponse.model_validate_json(
        (FIXTURE_DIR / "nhl_play_by_play_2005.json").read_bytes()
    )

    normalized = play_by_play_frames(response)
    goal = normalized.events.filter(pl.col("type_desc_key") == "goal").row(
        0,
        named=True,
    )
    roles = normalized.participants.filter(pl.col("source_event_id") == goal["source_event_id"])[
        "role"
    ].to_list()

    assert goal["x_coord"] is None
    assert goal["time_in_period_seconds"] == 650
    assert roles == ["goalie_in_net", "primary_assist", "scorer", "secondary_assist"]


def test_modern_events_preserve_location_and_penalty_context() -> None:
    response = PlayByPlayResponse.model_validate_json(
        (FIXTURE_DIR / "nhl_play_by_play_modern.json").read_bytes()
    )

    normalized = play_by_play_frames(response)
    shot = normalized.events.filter(pl.col("type_desc_key") == "shot-on-goal").row(
        0,
        named=True,
    )
    penalty = normalized.events.filter(pl.col("type_desc_key") == "penalty").row(
        0,
        named=True,
    )

    assert (shot["x_coord"], shot["y_coord"], shot["zone_code"]) == (-58, -22, "O")
    assert penalty["penalty_type_code"] == "MIN"
    assert penalty["penalty_desc_key"] == "slashing"
    assert penalty["penalty_duration_minutes"] == 2


def test_malformed_historical_clock_is_retained_without_inference() -> None:
    response = PlayByPlayResponse.model_validate_json(
        (FIXTURE_DIR / "nhl_play_by_play_2005.json").read_bytes()
    )
    response.plays[0].time_remaining = "0-10:0-11"

    event = play_by_play_frames(response).events.row(0, named=True)

    assert event["time_remaining"] == "0-10:0-11"
    assert event["time_remaining_seconds"] is None


def test_client_requests_expected_play_by_play_endpoint() -> None:
    fixture = (FIXTURE_DIR / "nhl_play_by_play_modern.json").read_bytes()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/gamecenter/2025020001/play-by-play"
        return httpx.Response(200, content=fixture)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        )
    )

    fetched = client.fetch_play_by_play(2025020001)

    assert fetched.play_by_play.id == 2025020001
    assert fetched.checksum == hashlib.sha256(fixture).hexdigest()
