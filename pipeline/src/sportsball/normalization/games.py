"""Normalize NHL schedule games into analytical rows."""

import polars as pl

from sportsball.clients.nhl.schemas import ScheduleResponse

SCHEDULE_SCHEMA = {
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


def schedule_games_frame(schedule: ScheduleResponse) -> pl.DataFrame:
    """Flatten a validated NHL schedule into a typed Polars dataframe."""
    records = [
        {
            "source_game_id": game.id,
            "season_id": game.season,
            "game_type": game.game_type,
            "game_date": day.date,
            "start_time_utc": game.start_time_utc,
            "state": game.game_state,
            "away_team_id": game.away_team.id,
            "away_team_abbrev": game.away_team.abbrev,
            "away_team_name": game.away_team.common_name.default,
            "home_team_id": game.home_team.id,
            "home_team_abbrev": game.home_team.abbrev,
            "home_team_name": game.home_team.common_name.default,
        }
        for day in schedule.game_week
        for game in day.games
    ]
    return pl.DataFrame(records, schema=SCHEDULE_SCHEMA)
