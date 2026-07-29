"""Unit tests for canonical schedule record construction."""

import polars as pl

from sportsball.persistence.repositories.schedules import ScheduleRepository


def test_schedule_dimensions_are_deduplicated() -> None:
    rows = [
        {
            "season_id": 20252026,
            "away_team_id": 6,
            "away_team_abbrev": "BOS",
            "away_team_name": "Bruins",
            "home_team_id": 10,
            "home_team_abbrev": "TOR",
            "home_team_name": "Maple Leafs",
        },
        {
            "season_id": 20252026,
            "away_team_id": 10,
            "away_team_abbrev": "TOR",
            "away_team_name": "Maple Leafs",
            "home_team_id": 6,
            "home_team_abbrev": "BOS",
            "home_team_name": "Bruins",
        },
    ]

    assert ScheduleRepository._season_rows(rows) == [
        {"id": 20252026, "start_year": 2025, "end_year": 2026}
    ]
    assert ScheduleRepository._team_rows(rows) == [
        {"nhl_id": 6, "abbreviation": "BOS", "name": "Bruins"},
        {"nhl_id": 10, "abbreviation": "TOR", "name": "Maple Leafs"},
    ]


def test_empty_schedule_upsert_is_a_noop() -> None:
    class SessionMustNotBeUsed:
        def execute(self, *_args: object, **_kwargs: object) -> None:
            raise AssertionError("empty schedules must not query the database")

    repository = ScheduleRepository(SessionMustNotBeUsed())  # type: ignore[arg-type]
    frame = pl.DataFrame(
        schema={
            "source_game_id": pl.Int64,
            "season_id": pl.Int64,
            "game_type": pl.Int64,
            "game_date": pl.Date,
            "start_time_utc": pl.Datetime(time_zone="UTC"),
            "state": pl.String,
            "away_team_id": pl.Int64,
            "away_team_abbrev": pl.String,
            "away_team_name": pl.String,
            "home_team_id": pl.Int64,
            "home_team_abbrev": pl.String,
            "home_team_name": pl.String,
        }
    )

    result = repository.upsert(frame)

    assert result.seasons == 0
    assert result.teams == 0
    assert result.games == 0
