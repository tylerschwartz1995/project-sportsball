"""Tests for Polars-derived season line and pairing statistics."""

import polars as pl
import pytest

from sportsball.normalization.moneypuck_unit_seasons import (
    moneypuck_unit_season_frame,
)


def test_unit_season_totals_canonicalize_players_and_recompute_shares() -> None:
    result = moneypuck_unit_season_frame(
        pl.DataFrame(
            [
                _row(
                    game_id=1,
                    player_ids=(30, 10, 20),
                    ice_time_seconds=600,
                    x_goals_for=2.0,
                    x_goals_against=1.0,
                    shot_attempts_for=20,
                    shot_attempts_against=10,
                ),
                _row(
                    game_id=2,
                    player_ids=(10, 20, 30),
                    ice_time_seconds=300,
                    x_goals_for=1.0,
                    x_goals_against=2.0,
                    shot_attempts_for=10,
                    shot_attempts_against=20,
                ),
            ]
        )
    ).to_dicts()

    assert len(result) == 1
    assert result[0] == {
        "season_id": 20252026,
        "team_id": 1,
        "player_1_id": 10,
        "player_2_id": 20,
        "player_3_id": 30,
        "unit_key": "10:20:30",
        "unit_type": "line",
        "derivation_version": "unit-season-v1",
        "games_played": 2,
        "ice_time_seconds": 900.0,
        "x_goals_percentage": 0.5,
        "corsi_percentage": 0.5,
        "x_goals_for": 3.0,
        "x_goals_against": 3.0,
        "goals_for": 2.0,
        "goals_against": 0.0,
        "shots_on_goal_for": 12.0,
        "shots_on_goal_against": 8.0,
        "shot_attempts_for": 30.0,
        "shot_attempts_against": 30.0,
        "high_danger_x_goals_for": 1.0,
        "high_danger_x_goals_against": 0.4,
    }


def test_unit_season_totals_preserve_missing_metrics() -> None:
    result = moneypuck_unit_season_frame(
        pl.DataFrame(
            [
                _row(player_ids=(10, 20, None), x_goals_for=None),
                _row(
                    game_id=2,
                    player_ids=(20, 10, None),
                    x_goals_for=1.0,
                ),
            ]
        )
    ).row(0, named=True)

    assert result["unit_type"] == "pairing"
    assert result["player_3_id"] is None
    assert result["x_goals_for"] is None
    assert result["x_goals_percentage"] is None


def test_unit_season_totals_reject_malformed_units() -> None:
    with pytest.raises(ValueError, match="three-player lines"):
        moneypuck_unit_season_frame(
            pl.DataFrame([_row(player_ids=(10, 20, None), unit_type="line")])
        )


def _row(
    *,
    game_id: int = 1,
    player_ids: tuple[int, int, int | None],
    unit_type: str | None = None,
    ice_time_seconds: float = 300,
    x_goals_for: float | None = 1.0,
    x_goals_against: float | None = 1.0,
    shot_attempts_for: float | None = 10,
    shot_attempts_against: float | None = 10,
) -> dict[str, int | float | str | None]:
    player_1_id, player_2_id, player_3_id = player_ids
    return {
        "game_id": game_id,
        "season_id": 20252026,
        "team_id": 1,
        "player_1_id": player_1_id,
        "player_2_id": player_2_id,
        "player_3_id": player_3_id,
        "unit_type": unit_type or ("line" if player_3_id is not None else "pairing"),
        "ice_time_seconds": ice_time_seconds,
        "x_goals_for": x_goals_for,
        "x_goals_against": x_goals_against,
        "goals_for": 1.0,
        "goals_against": 0.0,
        "shots_on_goal_for": 6.0,
        "shots_on_goal_against": 4.0,
        "shot_attempts_for": shot_attempts_for,
        "shot_attempts_against": shot_attempts_against,
        "high_danger_x_goals_for": 0.5,
        "high_danger_x_goals_against": 0.2,
    }
