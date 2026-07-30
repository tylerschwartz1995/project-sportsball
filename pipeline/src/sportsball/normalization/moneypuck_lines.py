"""Normalize MoneyPuck regular-season line and pairing archives."""

from io import BytesIO
from zipfile import BadZipFile, ZipFile

import polars as pl

from sportsball.normalization.moneypuck_seasons import canonical_team_expression

REQUIRED_COLUMNS = {
    "lineId",
    "name",
    "gameId",
    "season",
    "playerTeam",
    "opposingTeam",
    "home_or_away",
    "gameDate",
    "position",
    "situation",
    "icetime",
    "iceTimeRank",
    "xGoalsPercentage",
    "corsiPercentage",
    "fenwickPercentage",
    "xGoalsFor",
    "xGoalsAgainst",
    "goalsFor",
    "goalsAgainst",
    "shotsOnGoalFor",
    "shotsOnGoalAgainst",
    "shotAttemptsFor",
    "shotAttemptsAgainst",
    "scoreVenueAdjustedxGoalsFor",
    "scoreVenueAdjustedxGoalsAgainst",
    "highDangerxGoalsFor",
    "highDangerxGoalsAgainst",
    "totalShotCreditFor",
    "totalShotCreditAgainst",
}


def moneypuck_line_frame(season_id: int, archive_content: bytes) -> pl.DataFrame:
    """Extract, validate, and normalize one line/pairing season."""
    start_year = season_id // 10_000
    if season_id != start_year * 10_000 + start_year + 1:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    source = _read_archive(archive_content).with_columns(
        pl.col("lineId").cast(pl.String).alias("source_line_id")
    )
    years = set(source.get_column("season").unique().to_list())
    if years != {start_year}:
        raise ValueError(f"MoneyPuck line archive has seasons: {sorted(years)}")
    if set(source.get_column("position").unique().to_list()) != {"line", "pairing"}:
        raise ValueError("MoneyPuck line unit types changed")
    if set(source.get_column("situation").unique().to_list()) != {"5on5"}:
        raise ValueError("MoneyPuck line situations changed")
    bad_lengths = source.filter(
        ((pl.col("position") == "line") & (pl.col("source_line_id").str.len_chars() != 21))
        | ((pl.col("position") == "pairing") & (pl.col("source_line_id").str.len_chars() != 14))
    )
    if bad_lengths.height:
        raise ValueError("MoneyPuck line IDs no longer encode 7-digit NHL player IDs")
    frame = source.select(
        pl.col("gameId").cast(pl.Int64).alias("source_game_id"),
        pl.col("source_line_id"),
        pl.col("source_line_id").str.slice(0, 7).cast(pl.Int64).alias("source_player_1_id"),
        pl.col("source_line_id").str.slice(7, 7).cast(pl.Int64).alias("source_player_2_id"),
        pl.when(pl.col("position") == "line")
        .then(pl.col("source_line_id").str.slice(14, 7).cast(pl.Int64, strict=False))
        .otherwise(None)
        .alias("source_player_3_id"),
        canonical_team_expression("playerTeam"),
        canonical_team_expression("opposingTeam", alias="canonical_opponent_abbrev"),
        pl.col("name"),
        pl.col("position").alias("unit_type"),
        pl.col("situation"),
        (pl.col("home_or_away") == "HOME").alias("is_home"),
        pl.col("gameDate").cast(pl.String).str.strptime(pl.Date, "%Y%m%d").alias("game_date"),
        pl.col("icetime").cast(pl.Float64).alias("ice_time_seconds"),
        pl.col("iceTimeRank").cast(pl.Float64).alias("ice_time_rank"),
        pl.col("xGoalsPercentage").cast(pl.Float64).alias("x_goals_percentage"),
        pl.col("corsiPercentage").cast(pl.Float64).alias("corsi_percentage"),
        pl.col("fenwickPercentage").cast(pl.Float64).alias("fenwick_percentage"),
        pl.col("xGoalsFor").cast(pl.Float64).alias("x_goals_for"),
        pl.col("xGoalsAgainst").cast(pl.Float64).alias("x_goals_against"),
        pl.col("goalsFor").cast(pl.Float64).alias("goals_for"),
        pl.col("goalsAgainst").cast(pl.Float64).alias("goals_against"),
        pl.col("shotsOnGoalFor").cast(pl.Float64).alias("shots_on_goal_for"),
        pl.col("shotsOnGoalAgainst").cast(pl.Float64).alias("shots_on_goal_against"),
        pl.col("shotAttemptsFor").cast(pl.Float64).alias("shot_attempts_for"),
        pl.col("shotAttemptsAgainst").cast(pl.Float64).alias("shot_attempts_against"),
        pl.col("scoreVenueAdjustedxGoalsFor")
        .cast(pl.Float64)
        .alias("score_venue_adjusted_x_goals_for"),
        pl.col("scoreVenueAdjustedxGoalsAgainst")
        .cast(pl.Float64)
        .alias("score_venue_adjusted_x_goals_against"),
        pl.col("highDangerxGoalsFor").cast(pl.Float64).alias("high_danger_x_goals_for"),
        pl.col("highDangerxGoalsAgainst").cast(pl.Float64).alias("high_danger_x_goals_against"),
        pl.col("totalShotCreditFor").cast(pl.Float64).alias("total_shot_credit_for"),
        pl.col("totalShotCreditAgainst").cast(pl.Float64).alias("total_shot_credit_against"),
    ).sort("source_game_id", "canonical_team_abbrev", "source_line_id")
    keys = ["source_game_id", "canonical_team_abbrev", "source_line_id"]
    if frame.select(keys).n_unique() != frame.height:
        raise ValueError("duplicate MoneyPuck line-game keys")
    return frame


def _read_archive(content: bytes) -> pl.DataFrame:
    try:
        with ZipFile(BytesIO(content)) as archive:
            members = [
                m for m in archive.infolist() if not m.is_dir() and m.filename.endswith(".csv")
            ]
            if len(members) != 1:
                raise ValueError("MoneyPuck line archive must contain exactly one CSV")
            with archive.open(members[0]) as csv_file:
                return pl.read_csv(
                    csv_file,
                    columns=sorted(REQUIRED_COLUMNS),
                    infer_schema_length=10_000,
                    null_values=["NA", "NaN", "nan"],
                )
    except (BadZipFile, OSError, pl.exceptions.PolarsError) as error:
        raise ValueError(f"invalid MoneyPuck line archive: {error}") from error
