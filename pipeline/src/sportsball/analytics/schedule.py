"""Descriptive pre-game opponent context, preserving independent source coverage."""

from collections import defaultdict
from typing import Any

import polars as pl

DEFINITION_VERSION = "schedule-context-v1"


def schedule_context(
    games: pl.DataFrame,
    advanced: pl.DataFrame,
    seasons: list[int],
) -> list[dict[str, Any]]:
    """Use only earlier current-season results, then the preceding stored season.

    Ordering is (start_time_utc, internal game id) for opponent observations and
    (start_time_utc, NHL id) for rest, matching the original published definition.
    Retrospective corrected observations are descriptive, not availability evidence
    for model training. Expected-goal coverage is independent of final boxscores.
    """
    if games.is_empty():
        return []
    games = games.filter(pl.col("game_type") == 2)
    xg = {
        (row["game_id"], row["team_id"]): row
        for row in advanced.to_dicts()
        if row["situation"] == "5on5"
        and row["x_goals_for"] is not None
        and row["x_goals_against"] is not None
    }
    results: dict[tuple[int, int], list[float]] = defaultdict(lambda: [0, 0, 0])
    expected: dict[tuple[int, int], list[float]] = defaultdict(lambda: [0, 0])
    previous = dict(zip(sorted(seasons)[1:], sorted(seasons)[:-1], strict=True))
    rest: dict[tuple[int, int], tuple[int | None, bool]] = {}
    last: dict[tuple[int, int], Any] = {}
    for game in games.sort(["start_time_utc", "nhl_id"]).to_dicts():
        for team in (game["home_team_id"], game["away_team_id"]):
            key = (game["season_id"], team)
            days = (game["game_date"] - last[key]).days if key in last else None
            rest[game["id"], team] = (
                max(days - 1, 0) if days is not None else None,
                days is not None and days <= 1,
            )
            last[key] = game["game_date"]
    output: list[dict[str, Any]] = []
    # Seasons first: the previous stored season is a complete fallback population.
    for game in games.sort(["season_id", "start_time_utc", "id"]).to_dicts():
        season = game["season_id"]
        sides = (
            (game["home_team_id"], game["away_team_id"], game["home_score"], game["away_score"]),
            (game["away_team_id"], game["home_team_id"], game["away_score"], game["home_score"]),
        )
        for team, opponent, _, _ in sides:
            current_key, fallback_key = (season, opponent), (previous.get(season, 0), opponent)
            result_key = current_key if current_key in results else fallback_key
            expected_key = current_key if current_key in expected else fallback_key
            prior = results.get(result_key)
            prior_xg = expected.get(expected_key)
            days, back_to_back = rest[game["id"], team]
            output.append(
                {
                    "game_id": game["id"],
                    "team_id": team,
                    "opponent_prior_games": int(prior[0]) if prior else 0,
                    "opponent_results_season_id": result_key[0] if prior else None,
                    "opponent_expected_goals_season_id": expected_key[0] if prior_xg else None,
                    "opponent_points_percentage": prior[1] / (2 * prior[0]) if prior else None,
                    "opponent_goal_differential_per_game": prior[2] / prior[0] if prior else None,
                    "opponent_expected_goals_percentage": prior_xg[0] / sum(prior_xg)
                    if prior_xg and sum(prior_xg)
                    else None,
                    "rest_days": days,
                    "is_back_to_back": back_to_back,
                }
            )
        # Accumulate after both sides have read their opponent's earlier history.
        for team, _, score, opponent_score in sides:
            key = (season, team)
            if (
                game["state"] in ("FINAL", "OFF")
                and score is not None
                and opponent_score is not None
            ):
                points = (
                    2
                    if score > opponent_score
                    else (
                        1
                        if score < opponent_score and game["last_period_type"] in ("OT", "SO")
                        else 0
                    )
                )
                tally = results[key]
                tally[0] += 1
                tally[1] += points
                tally[2] += score - opponent_score
            observation = xg.get((game["id"], team))
            if observation:
                tally_xg = expected[key]
                tally_xg[0] += observation["x_goals_for"]
                tally_xg[1] += observation["x_goals_against"]
    return output
