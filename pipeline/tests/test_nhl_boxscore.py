"""Historical and modern NHL box-score contract tests."""

import hashlib
import json
from pathlib import Path

import httpx
import polars as pl
import pytest

from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.schemas import BoxscoreResponse
from sportsball.normalization.boxscores import boxscore_frames

FIXTURE_DIR = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize(
    ("fixture_name", "expected_game_id"),
    [
        ("nhl_boxscore_2005.json", 2005020001),
        ("nhl_boxscore_modern.json", 2025020001),
    ],
)
def test_historical_and_modern_boxscores_normalize(
    fixture_name: str,
    expected_game_id: int,
) -> None:
    boxscore = BoxscoreResponse.model_validate_json((FIXTURE_DIR / fixture_name).read_bytes())

    normalized = boxscore_frames(boxscore)

    assert boxscore.id == expected_game_id
    assert normalized.team_games.shape == (2, 7)
    assert normalized.skater_games.shape == (2, 20)
    expected_goalies = 4 if fixture_name == "nhl_boxscore_2005.json" else 2
    assert normalized.goalie_games.shape == (expected_goalies, 23)


def test_historical_time_and_goalie_splits_are_normalized() -> None:
    boxscore = BoxscoreResponse.model_validate_json(
        (FIXTURE_DIR / "nhl_boxscore_2005.json").read_bytes()
    )

    normalized = boxscore_frames(boxscore)
    koivu = normalized.skater_games.filter(normalized.skater_games["source_player_id"] == 8459442)
    theodore = normalized.goalie_games.filter(
        normalized.goalie_games["source_player_id"] == 8460535
    )

    assert koivu["time_on_ice_seconds"].item() == 1032
    assert theodore["even_strength_saves"].item() == 17
    assert theodore["even_strength_shots_against"].item() == 18
    historical_backup = normalized.goalie_games.filter(
        normalized.goalie_games["source_player_id"] == 8471186
    )
    assert historical_backup["time_on_ice_seconds"].item() is None


def test_historical_skater_allows_missing_time_on_ice() -> None:
    payload = json.loads((FIXTURE_DIR / "nhl_boxscore_2005.json").read_text())
    skater = payload["playerByGameStats"]["awayTeam"]["forwards"][0]
    del skater["toi"]

    boxscore = BoxscoreResponse.model_validate(payload)
    normalized = boxscore_frames(boxscore)
    historical_skater = normalized.skater_games.filter(
        pl.col("source_player_id") == skater["playerId"]
    )

    assert historical_skater["time_on_ice_seconds"].item() is None


def test_modern_backup_goalie_allows_missing_decision_and_save_percentage() -> None:
    boxscore = BoxscoreResponse.model_validate_json(
        (FIXTURE_DIR / "nhl_boxscore_modern.json").read_bytes()
    )

    normalized = boxscore_frames(boxscore)
    backup = normalized.goalie_games.filter(normalized.goalie_games["source_player_id"] == 8480193)

    assert backup["starter"].item() is False
    assert backup["decision"].item() is None
    assert backup["save_percentage"].item() is None


def test_client_requests_expected_boxscore_endpoint() -> None:
    fixture = (FIXTURE_DIR / "nhl_boxscore_2005.json").read_bytes()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/gamecenter/2005020001/boxscore"
        return httpx.Response(200, content=fixture)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        )
    )

    fetched = client.fetch_boxscore(2005020001)

    assert fetched.boxscore.id == 2005020001
    assert fetched.checksum == hashlib.sha256(fixture).hexdigest()
