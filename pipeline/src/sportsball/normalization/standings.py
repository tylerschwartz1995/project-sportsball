"""Normalize NHL-published standings snapshots with Polars."""

from dataclasses import dataclass
from datetime import date

import polars as pl

from sportsball.clients.nhl.schemas import StandingsResponse

STANDINGS_SCHEMA = {
    "snapshot_date": pl.Date,
    "season_id": pl.Int64,
    "game_type": pl.Int64,
    "source_team_abbrev": pl.String,
    "conference_name": pl.String,
    "division_name": pl.String,
    "games_played": pl.Int64,
    "wins": pl.Int64,
    "losses": pl.Int64,
    "ties": pl.Int64,
    "overtime_losses": pl.Int64,
    "points": pl.Int64,
    "regulation_wins": pl.Int64,
    "regulation_plus_overtime_wins": pl.Int64,
    "shootout_wins": pl.Int64,
    "shootout_losses": pl.Int64,
    "goals_for": pl.Int64,
    "goals_against": pl.Int64,
    "goal_differential": pl.Int64,
    "point_percentage": pl.Float64,
    "win_percentage": pl.Float64,
    "league_rank": pl.Int64,
    "conference_rank": pl.Int64,
    "division_rank": pl.Int64,
    "wildcard_rank": pl.Int64,
    "clinch_indicator": pl.String,
}


@dataclass(frozen=True)
class NormalizedStandings:
    """One validated official standings snapshot."""

    snapshot_date: date
    season_id: int
    rows: pl.DataFrame


def standings_frame(response: StandingsResponse) -> NormalizedStandings:
    """Flatten one official standings response into a typed frame."""
    if not response.standings:
        raise ValueError("standings response must contain at least one team")
    snapshot_dates = {row.date for row in response.standings}
    season_ids = {row.season_id for row in response.standings}
    if len(snapshot_dates) != 1:
        raise ValueError(f"standings response spans dates: {sorted(snapshot_dates)}")
    if len(season_ids) != 1:
        raise ValueError(f"standings response spans seasons: {sorted(season_ids)}")

    rows = [
        {
            "snapshot_date": row.date,
            "season_id": row.season_id,
            "game_type": row.game_type_id,
            "source_team_abbrev": row.team_abbrev.default,
            "conference_name": row.conference_name,
            "division_name": row.division_name,
            "games_played": row.games_played,
            "wins": row.wins,
            "losses": row.losses,
            "ties": row.ties,
            "overtime_losses": row.ot_losses,
            "points": row.points,
            "regulation_wins": row.regulation_wins,
            "regulation_plus_overtime_wins": row.regulation_plus_ot_wins,
            "shootout_wins": row.shootout_wins,
            "shootout_losses": row.shootout_losses,
            "goals_for": row.goals_for,
            "goals_against": row.goals_against,
            "goal_differential": row.goal_differential,
            "point_percentage": row.point_percentage,
            "win_percentage": row.win_percentage,
            "league_rank": row.league_sequence,
            "conference_rank": row.conference_sequence,
            "division_rank": row.division_sequence,
            "wildcard_rank": row.wildcard_sequence,
            "clinch_indicator": row.clinch_indicator,
        }
        for row in response.standings
    ]
    frame = pl.DataFrame(rows, schema=STANDINGS_SCHEMA).sort("league_rank")
    duplicate_abbrevs = (
        frame.group_by("source_team_abbrev")
        .len()
        .filter(pl.col("len") > 1)
        .get_column("source_team_abbrev")
        .to_list()
    )
    if duplicate_abbrevs:
        raise ValueError(f"duplicate standings teams: {duplicate_abbrevs}")
    return NormalizedStandings(
        snapshot_date=next(iter(snapshot_dates)),
        season_id=next(iter(season_ids)),
        rows=frame,
    )
