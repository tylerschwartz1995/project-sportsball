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
        {
            "nhl_id": 6,
            "franchise_id": 6,
            "abbreviation": "BOS",
            "name": "Bruins",
        },
        {
            "nhl_id": 10,
            "franchise_id": 5,
            "abbreviation": "TOR",
            "name": "Maple Leafs",
        },
    ]


def test_team_seasons_preserve_historical_identity_names() -> None:
    rows = [
        {
            "season_id": 20102011,
            "away_team_id": 11,
            "away_team_abbrev": "ATL",
            "away_team_name": "Thrashers",
            "home_team_id": 27,
            "home_team_abbrev": "PHX",
            "home_team_name": "Coyotes",
        },
        {
            "season_id": 20142015,
            "away_team_id": 52,
            "away_team_abbrev": "WPG",
            "away_team_name": "Jets",
            "home_team_id": 53,
            "home_team_abbrev": "ARI",
            "home_team_name": "Coyotes",
        },
        {
            "season_id": 20252026,
            "away_team_id": 59,
            "away_team_abbrev": "UTA",
            "away_team_name": "Hockey Club",
            "home_team_id": 6,
            "home_team_abbrev": "BOS",
            "home_team_name": "Bruins",
        },
    ]
    team_ids = {6: 1006, 11: 1011, 27: 1027, 52: 1052, 53: 1053, 59: 1059}

    assert ScheduleRepository._team_season_rows(rows, team_ids) == [
        {
            "team_id": 1011,
            "season_id": 20102011,
            "abbreviation": "ATL",
            "place_name": "Atlanta",
            "common_name": "Thrashers",
            "full_name": "Atlanta Thrashers",
        },
        {
            "team_id": 1027,
            "season_id": 20102011,
            "abbreviation": "PHX",
            "place_name": "Phoenix",
            "common_name": "Coyotes",
            "full_name": "Phoenix Coyotes",
        },
        {
            "team_id": 1052,
            "season_id": 20142015,
            "abbreviation": "WPG",
            "place_name": "Winnipeg",
            "common_name": "Jets",
            "full_name": "Winnipeg Jets",
        },
        {
            "team_id": 1053,
            "season_id": 20142015,
            "abbreviation": "ARI",
            "place_name": "Arizona",
            "common_name": "Coyotes",
            "full_name": "Arizona Coyotes",
        },
        {
            "team_id": 1006,
            "season_id": 20252026,
            "abbreviation": "BOS",
            "place_name": "Boston",
            "common_name": "Bruins",
            "full_name": "Boston Bruins",
        },
        {
            "team_id": 1059,
            "season_id": 20252026,
            "abbreviation": "UTA",
            "place_name": "Utah",
            "common_name": "Mammoth",
            "full_name": "Utah Mammoth",
        },
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
