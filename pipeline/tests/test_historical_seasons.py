"""Contracts, client, and Polars normalization for all-time season data."""

import hashlib
import json

import httpx
import polars as pl

from sportsball.clients.nhl.stats_client import NhlStatsClient
from sportsball.clients.nhl.stats_schemas import (
    GoalieSeasonSummary,
    SkaterSeasonSummary,
    TeamSeasonSummary,
)
from sportsball.normalization.historical_seasons import historical_season_frames


def test_stats_client_requests_one_bounded_season() -> None:
    payload = {
        "data": [
            {
                "playerId": 8445874,
                "skaterFullName": "Cy Denneny",
                "positionCode": "L",
                "seasonId": 19171918,
                "teamAbbrevs": "SEN",
                "gamesPlayed": 21,
                "goals": 36,
                "assists": 10,
                "points": 46,
                "penaltyMinutes": 80,
                "plusMinus": None,
                "shots": None,
            }
        ],
        "total": 1,
    }
    content = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/stats/rest/en/skater/summary"
        assert request.url.params["cayenneExp"] == "seasonId=19171918 and gameTypeId=2"
        assert request.url.params["limit"] == "100"
        return httpx.Response(200, content=content)

    client = NhlStatsClient(
        client=httpx.Client(
            base_url="https://example.test/stats/rest/en",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
    )
    fetched = client.fetch_skaters(19171918, 2)

    assert fetched.rows[0].player_name == "Cy Denneny"
    assert fetched.rows[0].plus_minus is None
    assert fetched.checksum == hashlib.sha256(content).hexdigest()


def test_normalization_preserves_era_specific_nulls() -> None:
    skater = SkaterSeasonSummary.model_validate(
        {
            "playerId": 8445874,
            "skaterFullName": "Cy Denneny",
            "positionCode": "L",
            "seasonId": 19171918,
            "teamAbbrevs": "SEN",
            "gamesPlayed": 21,
            "goals": 36,
            "assists": 10,
            "points": 46,
            "penaltyMinutes": 80,
            "plusMinus": None,
            "shots": None,
        }
    )
    goalie = GoalieSeasonSummary.model_validate(
        {
            "playerId": 8450137,
            "goalieFullName": "Georges Vezina",
            "seasonId": 19171918,
            "teamAbbrevs": "MTL",
            "gamesPlayed": 21,
            "gamesStarted": 21,
            "wins": 12,
            "losses": 9,
            "ties": 0,
            "goalsAgainst": 84,
            "goalsAgainstAverage": 3.93059,
            "savePct": None,
            "shotsAgainst": None,
            "shutouts": 1,
        }
    )
    team = TeamSeasonSummary.model_validate(
        {
            "teamId": 8,
            "teamFullName": "Montréal Canadiens",
            "seasonId": 19171918,
            "gamesPlayed": 22,
            "wins": 13,
            "losses": 9,
            "ties": 0,
            "points": 26,
            "pointPct": 0.5909,
            "goalsFor": 115,
            "goalsAgainst": 84,
        }
    )

    frames = historical_season_frames(
        [(2, skater)],
        [(2, goalie)],
        [(2, team)],
    )

    assert frames.skaters.schema["plus_minus"] == pl.Int64
    assert frames.skaters["plus_minus"].item() is None
    assert frames.goalies["save_percentage"].item() is None
    assert frames.teams["team_name"].item() == "Montréal Canadiens"


def test_stats_client_rejects_stalled_pagination() -> None:
    payload = json.dumps({"data": [], "total": 1}).encode()
    client = NhlStatsClient(
        client=httpx.Client(
            base_url="https://example.test/stats/rest/en",
            transport=httpx.MockTransport(lambda _request: httpx.Response(200, content=payload)),
        ),
        request_interval_seconds=0,
    )

    try:
        client.fetch_goalies(20252026, 2)
    except ValueError as error:
        assert "pagination stopped" in str(error)
    else:
        raise AssertionError("stalled NHL Stats pagination must fail")
