"""Official NHL standings contract and Polars normalization tests."""

import hashlib
from datetime import date
from typing import Any

import httpx

from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.schemas import StandingsResponse
from sportsball.normalization.standings import standings_frame


def test_official_standings_normalize_historical_rule_fields() -> None:
    normalized = standings_frame(StandingsResponse.model_validate(_standings_payload()))

    assert normalized.snapshot_date == date(2100, 4, 10)
    assert normalized.season_id == 20992100
    leader = normalized.rows.row(0, named=True)
    assert leader["source_team_abbrev"] == "TSA"
    assert leader["overtime_losses"] == 8
    assert leader["regulation_plus_overtime_wins"] == 54
    assert leader["league_rank"] == 1


def test_client_requests_expected_standings_date() -> None:
    payload = _standings_payload()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/standings/2100-04-10"
        return httpx.Response(200, json=payload)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        )
    )
    fetched = client.fetch_standings(date(2100, 4, 10))

    assert len(fetched.standings.standings) == 2
    assert fetched.checksum == hashlib.sha256(httpx.Response(200, json=payload).content).hexdigest()


def _standings_payload() -> dict[str, Any]:
    return {
        "wildCardIndicator": False,
        "standings": [
            _team_row(
                abbrev="TSA",
                name="Test Alpha",
                place="Alpha",
                rank=1,
                wins=58,
                losses=16,
                points=124,
            ),
            _team_row(
                abbrev="TSB",
                name="Test Beta",
                place="Beta",
                rank=2,
                wins=52,
                losses=20,
                points=110,
            ),
        ],
    }


def _team_row(
    *,
    abbrev: str,
    name: str,
    place: str,
    rank: int,
    wins: int,
    losses: int,
    points: int,
) -> dict[str, Any]:
    return {
        "seasonId": 20992100,
        "gameTypeId": 2,
        "date": "2100-04-10",
        "teamName": {"default": name},
        "teamCommonName": {"default": name.split()[-1]},
        "teamAbbrev": {"default": abbrev},
        "placeName": {"default": place},
        "conferenceName": "Western",
        "divisionName": "Test",
        "gamesPlayed": 82,
        "wins": wins,
        "losses": losses,
        "ties": 0,
        "otLosses": 8,
        "points": points,
        "regulationWins": wins - 7,
        "regulationPlusOtWins": wins - 4,
        "shootoutWins": 4,
        "shootoutLosses": 3,
        "goalFor": 300 - rank,
        "goalAgainst": 200 + rank,
        "goalDifferential": 100 - (rank * 2),
        "pointPctg": points / 164,
        "winPctg": wins / 82,
        "leagueSequence": rank,
        "conferenceSequence": rank,
        "divisionSequence": rank,
        "wildcardSequence": 0,
        "clinchIndicator": "p" if rank == 1 else "x",
    }
