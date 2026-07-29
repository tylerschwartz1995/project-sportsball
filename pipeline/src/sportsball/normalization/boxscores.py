"""Normalize NHL box scores into typed Polars frames."""

from dataclasses import dataclass

import polars as pl

from sportsball.clients.nhl.schemas import BoxscoreResponse, BoxscoreTeamPlayers

TEAM_GAME_SCHEMA = {
    "source_game_id": pl.Int64,
    "source_team_id": pl.Int64,
    "team_abbrev": pl.String,
    "team_name": pl.String,
    "is_home": pl.Boolean,
    "score": pl.Int64,
    "shots_on_goal": pl.Int64,
}

SKATER_GAME_SCHEMA = {
    "source_game_id": pl.Int64,
    "source_team_id": pl.Int64,
    "source_player_id": pl.Int64,
    "display_name": pl.String,
    "sweater_number": pl.Int64,
    "position": pl.String,
    "goals": pl.Int64,
    "assists": pl.Int64,
    "points": pl.Int64,
    "plus_minus": pl.Int64,
    "penalty_minutes": pl.Int64,
    "hits": pl.Int64,
    "power_play_goals": pl.Int64,
    "shots_on_goal": pl.Int64,
    "faceoff_win_percentage": pl.Float64,
    "blocked_shots": pl.Int64,
    "giveaways": pl.Int64,
    "takeaways": pl.Int64,
    "shifts": pl.Int64,
    "time_on_ice_seconds": pl.Int64,
}

GOALIE_GAME_SCHEMA = {
    "source_game_id": pl.Int64,
    "source_team_id": pl.Int64,
    "source_player_id": pl.Int64,
    "display_name": pl.String,
    "sweater_number": pl.Int64,
    "position": pl.String,
    "starter": pl.Boolean,
    "decision": pl.String,
    "goals_against": pl.Int64,
    "shots_against": pl.Int64,
    "saves": pl.Int64,
    "save_percentage": pl.Float64,
    "even_strength_goals_against": pl.Int64,
    "even_strength_saves": pl.Int64,
    "even_strength_shots_against": pl.Int64,
    "power_play_goals_against": pl.Int64,
    "power_play_saves": pl.Int64,
    "power_play_shots_against": pl.Int64,
    "shorthanded_goals_against": pl.Int64,
    "shorthanded_saves": pl.Int64,
    "shorthanded_shots_against": pl.Int64,
    "penalty_minutes": pl.Int64,
    "time_on_ice_seconds": pl.Int64,
}


@dataclass(frozen=True)
class NormalizedBoxscore:
    """Relational frames produced from one box score."""

    team_games: pl.DataFrame
    skater_games: pl.DataFrame
    goalie_games: pl.DataFrame


def boxscore_frames(boxscore: BoxscoreResponse) -> NormalizedBoxscore:
    """Flatten a validated box score into team, skater, and goalie frames."""
    team_rows = [
        {
            "source_game_id": boxscore.id,
            "source_team_id": team.id,
            "team_abbrev": team.abbrev,
            "team_name": team.common_name.default,
            "is_home": is_home,
            "score": team.score,
            "shots_on_goal": team.shots_on_goal,
        }
        for team, is_home in (
            (boxscore.away_team, False),
            (boxscore.home_team, True),
        )
    ]

    skater_rows: list[dict[str, object]] = []
    goalie_rows: list[dict[str, object]] = []
    for team_id, players in (
        (boxscore.away_team.id, boxscore.player_stats.away_team),
        (boxscore.home_team.id, boxscore.player_stats.home_team),
    ):
        skater_rows.extend(_skater_rows(boxscore.id, team_id, players))
        goalie_rows.extend(_goalie_rows(boxscore.id, team_id, players))

    return NormalizedBoxscore(
        team_games=pl.DataFrame(team_rows, schema=TEAM_GAME_SCHEMA),
        skater_games=pl.DataFrame(skater_rows, schema=SKATER_GAME_SCHEMA),
        goalie_games=pl.DataFrame(goalie_rows, schema=GOALIE_GAME_SCHEMA),
    )


def _skater_rows(
    game_id: int,
    team_id: int,
    players: BoxscoreTeamPlayers,
) -> list[dict[str, object]]:
    return [
        {
            "source_game_id": game_id,
            "source_team_id": team_id,
            "source_player_id": player.player_id,
            "display_name": player.name.default,
            "sweater_number": player.sweater_number,
            "position": player.position,
            "goals": player.goals,
            "assists": player.assists,
            "points": player.points,
            "plus_minus": player.plus_minus,
            "penalty_minutes": player.penalty_minutes,
            "hits": player.hits,
            "power_play_goals": player.power_play_goals,
            "shots_on_goal": player.shots_on_goal,
            "faceoff_win_percentage": player.faceoff_win_percentage,
            "blocked_shots": player.blocked_shots,
            "giveaways": player.giveaways,
            "takeaways": player.takeaways,
            "shifts": player.shifts,
            "time_on_ice_seconds": _time_on_ice_seconds(player.time_on_ice),
        }
        for player in [*players.forwards, *players.defense]
    ]


def _goalie_rows(
    game_id: int,
    team_id: int,
    players: BoxscoreTeamPlayers,
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for goalie in players.goalies:
        even_saves, even_shots = _shot_split(goalie.even_strength_shots)
        power_play_saves, power_play_shots = _shot_split(goalie.power_play_shots)
        shorthanded_saves, shorthanded_shots = _shot_split(goalie.shorthanded_shots)
        rows.append(
            {
                "source_game_id": game_id,
                "source_team_id": team_id,
                "source_player_id": goalie.player_id,
                "display_name": goalie.name.default,
                "sweater_number": goalie.sweater_number,
                "position": goalie.position,
                "starter": goalie.starter,
                "decision": goalie.decision,
                "goals_against": goalie.goals_against,
                "shots_against": goalie.shots_against,
                "saves": goalie.saves,
                "save_percentage": goalie.save_percentage,
                "even_strength_goals_against": goalie.even_strength_goals_against,
                "even_strength_saves": even_saves,
                "even_strength_shots_against": even_shots,
                "power_play_goals_against": goalie.power_play_goals_against,
                "power_play_saves": power_play_saves,
                "power_play_shots_against": power_play_shots,
                "shorthanded_goals_against": goalie.shorthanded_goals_against,
                "shorthanded_saves": shorthanded_saves,
                "shorthanded_shots_against": shorthanded_shots,
                "penalty_minutes": goalie.penalty_minutes,
                "time_on_ice_seconds": _time_on_ice_seconds(goalie.time_on_ice),
            }
        )
    return rows


def _time_on_ice_seconds(value: str | None) -> int | None:
    if value is None:
        return None
    minutes, seconds = value.split(":", maxsplit=1)
    return int(minutes) * 60 + int(seconds)


def _shot_split(value: str) -> tuple[int, int]:
    saves, shots = value.split("/", maxsplit=1)
    return int(saves), int(shots)
