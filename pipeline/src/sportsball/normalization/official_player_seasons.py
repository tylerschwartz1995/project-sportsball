"""Polars normalization for NHL-published player season team splits."""

import re
from dataclasses import dataclass

import polars as pl

from sportsball.clients.nhl.schemas import PlayerProfileResponse, PlayerSeasonTotal

SKATER_SCHEMA = {
    "season_id": pl.Int64,
    "game_type": pl.Int64,
    "source_player_id": pl.Int64,
    "source_team_name": pl.String,
    "sequence": pl.Int64,
    "games_played": pl.Int64,
    "goals": pl.Int64,
    "assists": pl.Int64,
    "points": pl.Int64,
    "penalty_minutes": pl.Int64,
    "plus_minus": pl.Int64,
    "average_time_on_ice": pl.String,
    "average_time_on_ice_seconds": pl.Int64,
    "faceoff_win_percentage": pl.Float64,
    "game_winning_goals": pl.Int64,
    "overtime_goals": pl.Int64,
    "power_play_goals": pl.Int64,
    "power_play_points": pl.Int64,
    "shorthanded_goals": pl.Int64,
    "shorthanded_points": pl.Int64,
    "shots": pl.Int64,
    "shooting_percentage": pl.Float64,
}
GOALIE_SCHEMA = {
    "season_id": pl.Int64,
    "game_type": pl.Int64,
    "source_player_id": pl.Int64,
    "source_team_name": pl.String,
    "sequence": pl.Int64,
    "games_played": pl.Int64,
    "games_started": pl.Int64,
    "wins": pl.Int64,
    "losses": pl.Int64,
    "ties": pl.Int64,
    "overtime_losses": pl.Int64,
    "goals": pl.Int64,
    "assists": pl.Int64,
    "points": pl.Int64,
    "penalty_minutes": pl.Int64,
    "time_on_ice": pl.String,
    "time_on_ice_seconds": pl.Int64,
    "goals_against": pl.Int64,
    "goals_against_average": pl.Float64,
    "shots_against": pl.Int64,
    "save_percentage": pl.Float64,
    "shutouts": pl.Int64,
}


@dataclass(frozen=True)
class NormalizedOfficialPlayerSeasons:
    """Official team-split frames for skaters and goalies."""

    skaters: pl.DataFrame
    goalies: pl.DataFrame


def official_player_season_frames(
    profiles: list[PlayerProfileResponse],
    season_ids: list[int],
) -> NormalizedOfficialPlayerSeasons:
    """Extract NHL-only rows in the requested season window."""
    requested = set(season_ids)
    skater_rows: list[dict[str, object]] = []
    goalie_rows: list[dict[str, object]] = []
    for profile in profiles:
        for total in profile.season_totals:
            if total.league_abbrev != "NHL" or total.season not in requested:
                continue
            if profile.position == "G" or _has_goalie_fields(total):
                goalie_rows.append(_goalie_row(profile.player_id, total))
            else:
                skater_rows.append(_skater_row(profile.player_id, total))

    skaters = pl.DataFrame(skater_rows, schema=SKATER_SCHEMA).sort(
        "season_id",
        "game_type",
        "source_player_id",
        "sequence",
    )
    goalies = pl.DataFrame(goalie_rows, schema=GOALIE_SCHEMA).sort(
        "season_id",
        "game_type",
        "source_player_id",
        "sequence",
    )
    _assert_unique(skaters, "skater")
    _assert_unique(goalies, "goalie")
    return NormalizedOfficialPlayerSeasons(skaters=skaters, goalies=goalies)


def _skater_row(player_id: int, total: PlayerSeasonTotal) -> dict[str, object]:
    return {
        "season_id": total.season,
        "game_type": total.game_type_id,
        "source_player_id": player_id,
        "source_team_name": total.team_name.default,
        "sequence": total.sequence,
        "games_played": total.games_played,
        "goals": total.goals,
        "assists": total.assists,
        "points": total.points,
        "penalty_minutes": total.penalty_minutes,
        "plus_minus": total.plus_minus,
        "average_time_on_ice": total.average_time_on_ice,
        "average_time_on_ice_seconds": _duration_seconds(total.average_time_on_ice),
        "faceoff_win_percentage": total.faceoff_win_percentage,
        "game_winning_goals": total.game_winning_goals,
        "overtime_goals": total.overtime_goals,
        "power_play_goals": total.power_play_goals,
        "power_play_points": total.power_play_points,
        "shorthanded_goals": total.shorthanded_goals,
        "shorthanded_points": total.shorthanded_points,
        "shots": total.shots,
        "shooting_percentage": total.shooting_percentage,
    }


def _goalie_row(player_id: int, total: PlayerSeasonTotal) -> dict[str, object]:
    return {
        "season_id": total.season,
        "game_type": total.game_type_id,
        "source_player_id": player_id,
        "source_team_name": total.team_name.default,
        "sequence": total.sequence,
        "games_played": total.games_played,
        "games_started": total.games_started,
        "wins": total.wins,
        "losses": total.losses,
        "ties": total.ties,
        "overtime_losses": total.overtime_losses,
        "goals": total.goals,
        "assists": total.assists,
        "points": total.points,
        "penalty_minutes": total.penalty_minutes,
        "time_on_ice": total.time_on_ice,
        "time_on_ice_seconds": _duration_seconds(total.time_on_ice),
        "goals_against": total.goals_against,
        "goals_against_average": total.goals_against_average,
        "shots_against": total.shots_against,
        "save_percentage": total.save_percentage,
        "shutouts": total.shutouts,
    }


def _has_goalie_fields(total: PlayerSeasonTotal) -> bool:
    return any(
        value is not None
        for value in (
            total.games_started,
            total.goals_against,
            total.shots_against,
            total.save_percentage,
        )
    )


def _duration_seconds(value: str | None) -> int | None:
    if value is None or re.fullmatch(r"\d+:\d{2}", value) is None:
        return None
    minutes, seconds = value.split(":", maxsplit=1)
    if not 0 <= int(seconds) < 60:
        return None
    return int(minutes) * 60 + int(seconds)


def _assert_unique(frame: pl.DataFrame, label: str) -> None:
    keys = ["season_id", "game_type", "source_player_id", "sequence"]
    if frame.select(keys).n_unique() != frame.height:
        raise ValueError(f"duplicate official {label} season split keys")
