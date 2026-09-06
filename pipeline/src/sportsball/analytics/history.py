"""Descriptive history v1: consecutive peaks and population-wide era baselines."""

import re
from decimal import Decimal, localcontext
from typing import Any

import polars as pl

DEFINITION_VERSION = "historical-v1"
KEYS = ["season_id", "game_type"]


def era_rates(skaters: pl.DataFrame, goalies: pl.DataFrame) -> list[dict[str, Any]]:
    """Compute league rates before any player/team/country filter is applied."""
    rates: dict[tuple[int, int], dict[str, Any]] = {}
    for frame, numerator, denominator, output in (
        (skaters, "points", "games_played", "points_per_game"),
        (goalies, "saves", "shots_against", "save_percentage"),
    ):
        if frame.is_empty():
            continue
        if output == "save_percentage":
            frame = frame.filter(pl.col("saves").is_not_null() & (pl.col("shots_against") > 0))
        for row in (
            frame.group_by(KEYS).agg(pl.col(numerator).sum(), pl.col(denominator).sum()).to_dicts()
        ):
            key = (row["season_id"], row["game_type"])
            entry = rates.setdefault(key, dict(zip(KEYS, key, strict=True)))
            with localcontext() as context:
                context.prec = 40
                entry[output] = (
                    Decimal(row[numerator]) / Decimal(row[denominator])
                    if row[denominator]
                    else None
                )
    return [
        {"points_per_game": None, "save_percentage": None, **row}
        for _, row in sorted(rates.items())
    ]


def peak_windows(frame: pl.DataFrame, kind: str) -> list[dict[str, Any]]:
    """A team filter must match every season in a complete consecutive window."""
    if frame.is_empty():
        return []
    metrics = ["wins", "shutouts"] if kind == "goalies" else ["goals", "assists", "points"]
    output: list[dict[str, Any]] = []
    for partition in frame.sort("season_id").partition_by(["player_id", "game_type"]):
        rows = partition.to_dicts()
        for window in (3, 5):
            for end in range(window - 1, len(rows)):
                group = rows[end - window + 1 : end + 1]
                if group[-1]["season_id"] // 10000 - group[0]["season_id"] // 10000 != window - 1:
                    continue
                teams = [set(re.split(r",\s*", row["team_abbrevs"] or "")) for row in group]
                values = {
                    metric: sum(row[metric] for row in group if row[metric] is not None)
                    if any(row[metric] is not None for row in group)
                    else None
                    for metric in metrics
                }
                output.append(
                    {
                        "player_id": group[0]["player_id"],
                        "game_type": group[0]["game_type"],
                        "kind": kind,
                        "window": window,
                        "start_season_id": group[0]["season_id"],
                        "end_season_id": group[-1]["season_id"],
                        "games_played": sum(row["games_played"] for row in group),
                        "common_teams": sorted(set.intersection(*teams)),
                        "goals": None,
                        "assists": None,
                        "points": None,
                        "wins": None,
                        "shutouts": None,
                        **values,
                    }
                )
    return output
