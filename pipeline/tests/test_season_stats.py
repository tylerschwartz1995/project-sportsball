"""Unit tests for Polars season-stat transformations."""

import polars as pl
import pytest

from sportsball.normalization.season_stats import (
    goalie_season_stats_frame,
    skater_season_stats_frame,
    team_season_stats_frame,
)


def test_skater_totals_combine_traded_player_and_preserve_missing_toi() -> None:
    rows = [
        _skater_row(team_id=10, goals=1, assists=2, time_on_ice_seconds=1_200),
        _skater_row(team_id=20, goals=2, assists=1, time_on_ice_seconds=None),
    ]

    result = skater_season_stats_frame(pl.DataFrame(rows)).to_dicts()

    assert result == [
        {
            "season_id": 20252026,
            "game_type": 2,
            "player_id": 100,
            "games_played": 2,
            "teams_played_for": 2,
            "goals": 3,
            "assists": 3,
            "points": 6,
            "plus_minus": 2,
            "penalty_minutes": 4,
            "hits": 6,
            "power_play_goals": 2,
            "shots_on_goal": 10,
            "blocked_shots": 4,
            "giveaways": 2,
            "takeaways": 4,
            "shifts": 40,
            "time_on_ice_seconds": None,
            "time_on_ice_games": 1,
        }
    ]


def test_goalie_totals_exclude_dressed_backup_and_weight_save_percentage() -> None:
    result = goalie_season_stats_frame(
        pl.DataFrame(
            [
                _goalie_row(
                    player_id=200,
                    starter=True,
                    decision="W",
                    goals_against=2,
                    shots_against=20,
                    saves=18,
                    time_on_ice_seconds=3_600,
                ),
                _goalie_row(
                    player_id=200,
                    starter=False,
                    decision="O",
                    goals_against=1,
                    shots_against=10,
                    saves=9,
                    time_on_ice_seconds=1_200,
                ),
                _goalie_row(
                    player_id=201,
                    starter=False,
                    decision=None,
                    goals_against=0,
                    shots_against=0,
                    saves=0,
                    time_on_ice_seconds=0,
                ),
            ]
        )
    ).to_dicts()

    assert len(result) == 1
    assert result[0]["player_id"] == 200
    assert result[0]["games_played"] == 2
    assert result[0]["games_started"] == 1
    assert result[0]["wins"] == 1
    assert result[0]["losses"] == 0
    assert result[0]["overtime_losses"] == 1
    assert result[0]["goals_against"] == 3
    assert result[0]["shots_against"] == 30
    assert result[0]["saves"] == 27
    assert result[0]["save_percentage"] == pytest.approx(0.9)
    assert result[0]["time_on_ice_seconds"] == 4_800


def test_team_totals_pair_each_game_with_its_opponent() -> None:
    result = team_season_stats_frame(
        pl.DataFrame(
            [
                _team_row(game_id=1, team_id=10, score=4, shots=30),
                _team_row(game_id=1, team_id=20, score=2, shots=25),
                _team_row(game_id=2, team_id=10, score=1, shots=20),
                _team_row(game_id=2, team_id=20, score=3, shots=27),
            ]
        )
    ).to_dicts()

    assert result == [
        {
            "season_id": 20252026,
            "game_type": 2,
            "team_id": 10,
            "games_played": 2,
            "wins": 1,
            "losses": 1,
            "goals_for": 5,
            "goals_against": 5,
            "shots_for": 50,
            "shots_against": 52,
        },
        {
            "season_id": 20252026,
            "game_type": 2,
            "team_id": 20,
            "games_played": 2,
            "wins": 1,
            "losses": 1,
            "goals_for": 5,
            "goals_against": 5,
            "shots_for": 52,
            "shots_against": 50,
        },
    ]


def test_team_totals_reject_incomplete_game_pair() -> None:
    with pytest.raises(ValueError, match="exactly two"):
        team_season_stats_frame(pl.DataFrame([_team_row(game_id=1, team_id=10, score=4, shots=30)]))


def _skater_row(
    *,
    team_id: int,
    goals: int,
    assists: int,
    time_on_ice_seconds: int | None,
) -> dict[str, int | None]:
    return {
        "season_id": 20252026,
        "game_type": 2,
        "player_id": 100,
        "team_id": team_id,
        "goals": goals,
        "assists": assists,
        "points": goals + assists,
        "plus_minus": 1,
        "penalty_minutes": 2,
        "hits": 3,
        "power_play_goals": 1,
        "shots_on_goal": 5,
        "blocked_shots": 2,
        "giveaways": 1,
        "takeaways": 2,
        "shifts": 20,
        "time_on_ice_seconds": time_on_ice_seconds,
    }


def _goalie_row(
    *,
    player_id: int,
    starter: bool,
    decision: str | None,
    goals_against: int,
    shots_against: int,
    saves: int,
    time_on_ice_seconds: int,
) -> dict[str, int | str | bool | None]:
    return {
        "season_id": 20252026,
        "game_type": 2,
        "player_id": player_id,
        "team_id": 10,
        "starter": starter,
        "decision": decision,
        "goals_against": goals_against,
        "shots_against": shots_against,
        "saves": saves,
        "even_strength_goals_against": goals_against,
        "even_strength_saves": saves,
        "even_strength_shots_against": shots_against,
        "power_play_goals_against": 0,
        "power_play_saves": 0,
        "power_play_shots_against": 0,
        "shorthanded_goals_against": 0,
        "shorthanded_saves": 0,
        "shorthanded_shots_against": 0,
        "penalty_minutes": 0,
        "time_on_ice_seconds": time_on_ice_seconds,
    }


def _team_row(*, game_id: int, team_id: int, score: int, shots: int) -> dict[str, int]:
    return {
        "game_id": game_id,
        "season_id": 20252026,
        "game_type": 2,
        "team_id": team_id,
        "score": score,
        "shots_on_goal": shots,
    }
