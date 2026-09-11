"""Official NHL standings contract and Polars normalization tests."""

import hashlib
import os
from datetime import date
from typing import Any

import httpx
import pytest

from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.schemas import StandingsCalendarResponse, StandingsResponse
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


@pytest.mark.parametrize(
    "requested,expected",
    [
        ("2099-10-01", "2099-10-01"),
        ("2100-01-10", "2100-01-10"),
        ("2100-04-10", "2100-04-10"),
        ("2100-09-11", "2100-04-10"),
        ("2100-10-01", "2100-10-01"),
    ],
)
def test_standings_calendar_preserves_actual_snapshot_date(requested: str, expected: str) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/standings-season"
        return httpx.Response(
            200,
            json={
                "seasons": [
                    {"id": 20992100, "standingsStart": "2099-10-01", "standingsEnd": "2100-04-10"},
                    {"id": 21002101, "standingsStart": "2100-10-01", "standingsEnd": "2101-04-10"},
                ]
            },
        )

    with NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1", transport=httpx.MockTransport(handler)
        )
    ) as client:
        result = client.fetch_standings_calendar()
    assert result.calendar.latest_date(date.fromisoformat(requested)) == date.fromisoformat(
        expected
    )
    assert result.payload["seasons"]


def test_standings_calendar_rejects_future_only_and_invalid_ranges() -> None:
    with pytest.raises(ValueError):
        StandingsCalendarResponse.model_validate({"seasons": []})
    with pytest.raises(ValueError):
        StandingsCalendarResponse.model_validate(
            {
                "seasons": [
                    {"id": 20992100, "standingsStart": "2100-04-10", "standingsEnd": "2099-10-01"},
                ]
            }
        )
    calendar = StandingsCalendarResponse.model_validate(
        {
            "seasons": [
                {"id": 20992100, "standingsStart": "2099-10-01", "standingsEnd": "2100-04-10"},
            ]
        }
    )
    with pytest.raises(ValueError, match="no published standings period"):
        calendar.latest_date(date(2099, 9, 30))


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="requires isolated PostgreSQL test database",
)
def test_daily_standings_gap_keeps_source_date_and_calendar_audit() -> None:
    from sqlalchemy import delete, select

    from sportsball.ingestion.orchestration.standings import ingest_standings
    from sportsball.persistence.database import session_scope
    from sportsball.persistence.models import (
        IngestionRun,
        OfficialStandingsSnapshot,
        Season,
        SourcePayload,
        Team,
        TeamSeason,
    )

    season_id = 31503151
    team_ids = (9876501, 9876502)
    payload = _standings_payload()
    for row in payload["standings"]:
        row.update(seasonId=season_id, date="3151-04-10")
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if request.url.path == "/v1/standings-season":
            return httpx.Response(
                200,
                json={
                    "seasons": [
                        {
                            "id": season_id,
                            "standingsStart": "3150-10-01",
                            "standingsEnd": "3151-04-10",
                        }
                    ]
                },
            )
        assert request.url.path == "/v1/standings/3151-04-10"
        return httpx.Response(200, json=payload)

    run_ids = []
    with session_scope() as session:
        session.add(Season(id=season_id, start_year=3150, end_year=3151))
        for team_id, abbrev in zip(team_ids, ("TSA", "TSB"), strict=True):
            session.add(Team(id=team_id, nhl_id=team_id, abbreviation=abbrev, name=abbrev))
        session.flush()
        for team_id, abbrev in zip(team_ids, ("TSA", "TSB"), strict=True):
            session.add(
                TeamSeason(
                    team_id=team_id,
                    season_id=season_id,
                    abbreviation=abbrev,
                    full_name=abbrev,
                    common_name=abbrev,
                    place_name=abbrev,
                )
            )
    try:
        with NhlClient(
            client=httpx.Client(
                base_url="https://example.test/v1", transport=httpx.MockTransport(handler)
            ),
            request_interval_seconds=0,
        ) as client:
            for _ in range(2):
                result = ingest_standings(date(3151, 9, 11), client, latest_available=True)
                run_ids.append(result.run_id)
                assert result.snapshot_date == date(3151, 4, 10)
        with session_scope() as session:
            rows = session.scalars(
                select(OfficialStandingsSnapshot).where(
                    OfficialStandingsSnapshot.season_id == season_id
                )
            ).all()
            assert len(rows) == 2
            assert all(row.snapshot_date == date(3151, 4, 10) for row in rows)
            run = session.get(IngestionRun, run_ids[-1])
            assert run is not None and run.parameters["requested_date"] == "3151-09-11"
            assert run.parameters["snapshot_date"] == "3151-04-10"
            sources = session.scalars(
                select(SourcePayload).where(SourcePayload.ingestion_run_id.in_(run_ids))
            ).all()
            assert {row.resource_type for row in sources} == {"standings", "standings_calendar"}
            assert len(sources) == 2
    finally:
        with session_scope() as session:
            session.execute(
                delete(OfficialStandingsSnapshot).where(
                    OfficialStandingsSnapshot.season_id == season_id
                )
            )
            session.execute(
                delete(SourcePayload).where(SourcePayload.ingestion_run_id.in_(run_ids))
            )
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
            session.execute(delete(TeamSeason).where(TeamSeason.season_id == season_id))
            session.execute(delete(Team).where(Team.id.in_(team_ids)))
            session.execute(delete(Season).where(Season.id == season_id))
