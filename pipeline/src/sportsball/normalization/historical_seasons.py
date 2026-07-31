"""Polars normalization for NHL all-time season summaries."""

from dataclasses import dataclass

import polars as pl

from sportsball.clients.nhl.stats_schemas import (
    GoalieSeasonSummary,
    SkaterSeasonSummary,
    TeamSeasonSummary,
)

SKATER_SCHEMA = {
    "season_id": pl.Int64,
    "game_type": pl.Int64,
    "source_player_id": pl.Int64,
    "player_name": pl.String,
    "position": pl.String,
    "team_abbrevs": pl.String,
    "games_played": pl.Int64,
    "goals": pl.Int64,
    "assists": pl.Int64,
    "points": pl.Int64,
    "penalty_minutes": pl.Int64,
    "plus_minus": pl.Int64,
    "game_winning_goals": pl.Int64,
    "power_play_goals": pl.Int64,
    "power_play_points": pl.Int64,
    "shorthanded_goals": pl.Int64,
    "shorthanded_points": pl.Int64,
    "shots": pl.Int64,
    "shooting_percentage": pl.Float64,
    "time_on_ice_per_game_seconds": pl.Float64,
    "faceoff_win_percentage": pl.Float64,
}

GOALIE_SCHEMA = {
    "season_id": pl.Int64,
    "game_type": pl.Int64,
    "source_player_id": pl.Int64,
    "player_name": pl.String,
    "position": pl.String,
    "team_abbrevs": pl.String,
    "games_played": pl.Int64,
    "games_started": pl.Int64,
    "wins": pl.Int64,
    "losses": pl.Int64,
    "ties": pl.Int64,
    "overtime_losses": pl.Int64,
    "goals_against": pl.Int64,
    "goals_against_average": pl.Float64,
    "saves": pl.Int64,
    "shots_against": pl.Int64,
    "save_percentage": pl.Float64,
    "shutouts": pl.Int64,
    "time_on_ice_seconds": pl.Int64,
}

TEAM_SCHEMA = {
    "season_id": pl.Int64,
    "game_type": pl.Int64,
    "nhl_team_id": pl.Int64,
    "team_name": pl.String,
    "games_played": pl.Int64,
    "wins": pl.Int64,
    "losses": pl.Int64,
    "ties": pl.Int64,
    "overtime_losses": pl.Int64,
    "points": pl.Int64,
    "point_percentage": pl.Float64,
    "goals_for": pl.Int64,
    "goals_against": pl.Int64,
    "regulation_and_overtime_wins": pl.Int64,
    "shots_for_per_game": pl.Float64,
    "shots_against_per_game": pl.Float64,
    "power_play_percentage": pl.Float64,
    "penalty_kill_percentage": pl.Float64,
}


@dataclass(frozen=True)
class HistoricalSeasonFrames:
    """Normalized all-time player and team frames."""

    skaters: pl.DataFrame
    goalies: pl.DataFrame
    teams: pl.DataFrame


def historical_season_frames(
    skaters: list[tuple[int, SkaterSeasonSummary]],
    goalies: list[tuple[int, GoalieSeasonSummary]],
    teams: list[tuple[int, TeamSeasonSummary]],
) -> HistoricalSeasonFrames:
    """Normalize typed NHL rows while retaining era-specific nulls."""
    skater_frame = pl.DataFrame(
        [_skater_row(game_type, row) for game_type, row in skaters],
        schema=SKATER_SCHEMA,
        strict=False,
    ).sort("season_id", "game_type", "source_player_id")
    goalie_frame = pl.DataFrame(
        [_goalie_row(game_type, row) for game_type, row in goalies],
        schema=GOALIE_SCHEMA,
        strict=False,
    ).sort("season_id", "game_type", "source_player_id")
    team_frame = pl.DataFrame(
        [_team_row(game_type, row) for game_type, row in teams],
        schema=TEAM_SCHEMA,
        strict=False,
    ).sort("season_id", "game_type", "nhl_team_id")
    _assert_unique(skater_frame, ["season_id", "game_type", "source_player_id"], "skater")
    _assert_unique(goalie_frame, ["season_id", "game_type", "source_player_id"], "goalie")
    _assert_unique(team_frame, ["season_id", "game_type", "nhl_team_id"], "team")
    return HistoricalSeasonFrames(
        skaters=skater_frame,
        goalies=goalie_frame,
        teams=team_frame,
    )


def _skater_row(game_type: int, row: SkaterSeasonSummary) -> dict[str, object]:
    return {
        "season_id": row.season_id,
        "game_type": game_type,
        "source_player_id": row.player_id,
        "player_name": row.player_name,
        "position": row.position,
        "team_abbrevs": row.team_abbrevs,
        "games_played": row.games_played,
        "goals": row.goals,
        "assists": row.assists,
        "points": row.points,
        "penalty_minutes": row.penalty_minutes,
        "plus_minus": row.plus_minus,
        "game_winning_goals": row.game_winning_goals,
        "power_play_goals": row.power_play_goals,
        "power_play_points": row.power_play_points,
        "shorthanded_goals": row.shorthanded_goals,
        "shorthanded_points": row.shorthanded_points,
        "shots": row.shots,
        "shooting_percentage": row.shooting_percentage,
        "time_on_ice_per_game_seconds": row.time_on_ice_per_game_seconds,
        "faceoff_win_percentage": row.faceoff_win_percentage,
    }


def _goalie_row(game_type: int, row: GoalieSeasonSummary) -> dict[str, object]:
    return {
        "season_id": row.season_id,
        "game_type": game_type,
        "source_player_id": row.player_id,
        "player_name": row.player_name,
        "position": "G",
        "team_abbrevs": row.team_abbrevs,
        "games_played": row.games_played,
        "games_started": row.games_started,
        "wins": row.wins,
        "losses": row.losses,
        "ties": row.ties,
        "overtime_losses": row.overtime_losses,
        "goals_against": row.goals_against,
        "goals_against_average": row.goals_against_average,
        "saves": row.saves,
        "shots_against": row.shots_against,
        "save_percentage": row.save_percentage,
        "shutouts": row.shutouts,
        "time_on_ice_seconds": row.time_on_ice_seconds,
    }


def _team_row(game_type: int, row: TeamSeasonSummary) -> dict[str, object]:
    return {
        "season_id": row.season_id,
        "game_type": game_type,
        "nhl_team_id": row.team_id,
        "team_name": row.team_name,
        "games_played": row.games_played,
        "wins": row.wins,
        "losses": row.losses,
        "ties": row.ties,
        "overtime_losses": row.overtime_losses,
        "points": row.points,
        "point_percentage": row.point_percentage,
        "goals_for": row.goals_for,
        "goals_against": row.goals_against,
        "regulation_and_overtime_wins": row.regulation_and_overtime_wins,
        "shots_for_per_game": row.shots_for_per_game,
        "shots_against_per_game": row.shots_against_per_game,
        "power_play_percentage": row.power_play_percentage,
        "penalty_kill_percentage": row.penalty_kill_percentage,
    }


def _assert_unique(frame: pl.DataFrame, keys: list[str], label: str) -> None:
    if frame.select(keys).n_unique() != frame.height:
        raise ValueError(f"duplicate historical {label} season keys")
