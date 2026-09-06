"""Reference cases for descriptive definitions, independent of the web renderer."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

import polars as pl
import pytest

from sportsball.analytics.history import era_rates, peak_windows
from sportsball.analytics.schedule import schedule_context


def test_peaks_require_consecutive_seasons_and_every_season_team_match() -> None:
    rows = [
        {
            "player_id": 1,
            "game_type": 2,
            "season_id": y * 10000 + y + 1,
            "games_played": 10,
            "team_abbrevs": team,
            "goals": 1,
            "assists": None,
            "points": 2,
        }
        for y, team in [(2020, "A, B"), (2021, "B"), (2022, "B, C"), (2023, "C"), (2025, "B")]
    ]
    peaks = peak_windows(pl.DataFrame(rows), "skaters")
    assert [
        (r["start_season_id"], r["common_teams"], r["points"], r["assists"]) for r in peaks
    ] == [(20202021, ["B"], 6, None), (20212022, [], 6, None)]
    assert peak_windows(pl.DataFrame(), "skaters") == []


def test_era_rates_preserve_phase_denominators_and_missing_goalie_coverage() -> None:
    skaters = pl.DataFrame(
        {
            "season_id": [1, 1, 1],
            "game_type": [2, 2, 3],
            "points": [10, 30, 1],
            "games_played": [10, 10, 10],
        }
    )
    goalies = pl.DataFrame(
        {
            "season_id": [1, 1, 1],
            "game_type": [2, 2, 3],
            "saves": [9, None, 0],
            "shots_against": [10, 100, 0],
        }
    )
    rates = era_rates(skaters, goalies)
    assert rates == [
        {
            "season_id": 1,
            "game_type": 2,
            "points_per_game": Decimal(2),
            "save_percentage": Decimal("0.9"),
        },
        {
            "season_id": 1,
            "game_type": 3,
            "points_per_game": Decimal("0.1"),
            "save_percentage": None,
        },
    ]
    assert era_rates(pl.DataFrame(), pl.DataFrame()) == []


def game(identity: int, season: int, day: int, **overrides: Any) -> dict[str, Any]:
    return {
        "id": identity,
        "nhl_id": identity,
        "season_id": season,
        "game_type": 2,
        "start_time_utc": datetime(2025, 1, 1, tzinfo=UTC) + timedelta(days=day),
        "game_date": date(2025, 1, 1) + timedelta(days=day),
        "home_team_id": 1,
        "away_team_id": 2,
        "state": "OFF",
        "home_score": 3,
        "away_score": 2,
        "last_period_type": "REG",
        **overrides,
    }


def test_schedule_uses_prior_observations_and_independent_fallbacks() -> None:
    games = pl.DataFrame(
        [
            game(1, 20232024, 0),
            game(2, 20242025, 10, last_period_type="OT"),
            game(3, 20242025, 11, state="FUT", home_score=None, away_score=None),
        ]
    )
    advanced = pl.DataFrame(
        [
            {
                "game_id": 1,
                "team_id": 2,
                "situation": "5on5",
                "x_goals_for": 1.0,
                "x_goals_against": 3.0,
            },
            {
                "game_id": 2,
                "team_id": 2,
                "situation": "5on5",
                "x_goals_for": 0.0,
                "x_goals_against": None,
            },
        ]
    )
    rows = schedule_context(games, advanced, [20232024, 20242025])
    opening = next(r for r in rows if r["game_id"] == 2 and r["team_id"] == 1)
    assert opening["opponent_results_season_id"] == 20232024
    assert opening["opponent_prior_games"] == 1
    upcoming = next(r for r in rows if r["game_id"] == 3 and r["team_id"] == 1)
    assert upcoming["opponent_results_season_id"] == 20242025
    assert upcoming["opponent_expected_goals_season_id"] == 20232024
    assert upcoming["opponent_points_percentage"] == 0.5
    assert upcoming["opponent_expected_goals_percentage"] == 0.25
    assert upcoming["rest_days"] == 0 and upcoming["is_back_to_back"]
    assert opening["rest_days"] is None


def test_schedule_zero_xg_is_covered_but_has_no_share_and_playoffs_are_excluded() -> None:
    games = pl.DataFrame([game(1, 1, 0), game(2, 1, 1, game_type=3), game(3, 1, 2)])
    advanced = pl.DataFrame(
        [
            {
                "game_id": 1,
                "team_id": 2,
                "situation": "5on5",
                "x_goals_for": 0.0,
                "x_goals_against": 0.0,
            }
        ]
    )
    rows = schedule_context(games, advanced, [1])
    assert len(rows) == 4
    row = next(r for r in rows if r["game_id"] == 3 and r["team_id"] == 1)
    assert row["opponent_expected_goals_season_id"] == 1
    assert row["opponent_expected_goals_percentage"] is None
    assert row["rest_days"] == 1 and not row["is_back_to_back"]
    assert row["opponent_prior_games"] == 1
    assert schedule_context(pl.DataFrame(), pl.DataFrame(), []) == []


def test_schedule_equal_start_times_use_internal_identity_for_observations() -> None:
    games = pl.DataFrame([game(2, 1, 0, nhl_id=1), game(1, 1, 0, nhl_id=2)])
    rows = schedule_context(games, pl.DataFrame(), [1])
    first = next(r for r in rows if r["game_id"] == 1 and r["team_id"] == 1)
    second = next(r for r in rows if r["game_id"] == 2 and r["team_id"] == 1)
    assert first["opponent_prior_games"] == 0
    assert first["is_back_to_back"]
    assert second["opponent_prior_games"] == 1
    assert second["rest_days"] is None


@pytest.mark.parametrize("kind, metric", [("skaters", "points"), ("goalies", "wins")])
def test_five_year_peaks_sum_both_kinds(kind: str, metric: str) -> None:
    rows = [
        {
            "player_id": 1,
            "game_type": 3,
            "season_id": y * 10000 + y + 1,
            "games_played": 2,
            "team_abbrevs": None,
            "goals": 0,
            "assists": 0,
            "points": 1,
            "wins": 1,
            "shutouts": 0,
        }
        for y in range(2020, 2025)
    ]
    window = next(r for r in peak_windows(pl.DataFrame(rows), kind) if r["window"] == 5)
    assert window[metric] == 5
    assert window["games_played"] == 10
