"""Normalize MoneyPuck's published all-team game-level CSV."""

from io import BytesIO

import polars as pl

from sportsball.normalization.moneypuck_seasons import (
    EXPECTED_SITUATIONS,
    canonical_team_expression,
)

REQUIRED_COLUMNS = {
    "team",
    "season",
    "gameId",
    "playerTeam",
    "opposingTeam",
    "home_or_away",
    "gameDate",
    "situation",
    "xGoalsPercentage",
    "corsiPercentage",
    "fenwickPercentage",
    "iceTime",
    "xGoalsFor",
    "xGoalsAgainst",
    "flurryAdjustedxGoalsFor",
    "flurryAdjustedxGoalsAgainst",
    "scoreVenueAdjustedxGoalsFor",
    "scoreVenueAdjustedxGoalsAgainst",
    "shotsOnGoalFor",
    "shotsOnGoalAgainst",
    "shotAttemptsFor",
    "shotAttemptsAgainst",
    "goalsFor",
    "goalsAgainst",
    "lowDangerxGoalsFor",
    "lowDangerxGoalsAgainst",
    "mediumDangerxGoalsFor",
    "mediumDangerxGoalsAgainst",
    "highDangerxGoalsFor",
    "highDangerxGoalsAgainst",
    "totalShotCreditFor",
    "totalShotCreditAgainst",
    "playoffGame",
}


def moneypuck_team_game_frame(
    content: bytes,
    season_ids: list[int],
) -> pl.DataFrame:
    """Validate and normalize a bounded season range from the all-team file."""
    try:
        source = pl.read_csv(
            BytesIO(content),
            infer_schema_length=10_000,
            null_values=["NA", "NaN", "nan"],
        )
    except Exception as error:
        raise ValueError(f"invalid MoneyPuck team-game CSV: {error}") from error
    missing = REQUIRED_COLUMNS - set(source.columns)
    if missing:
        raise ValueError(f"MoneyPuck team-game columns missing: {sorted(missing)}")
    float_columns = [
        name for name, dtype in source.schema.items() if dtype in (pl.Float32, pl.Float64)
    ]
    if float_columns:
        source = source.with_columns([pl.col(name).fill_nan(None) for name in float_columns])
    requested_years = {season_id // 10_000 for season_id in season_ids}
    filtered = source.filter(pl.col("season").is_in(requested_years))
    found_years = set(filtered.get_column("season").unique().to_list())
    if found_years != requested_years:
        raise ValueError(
            f"MoneyPuck team games missing seasons: {sorted(requested_years - found_years)}"
        )
    situations = set(filtered.get_column("situation").unique().to_list())
    if situations != EXPECTED_SITUATIONS:
        raise ValueError(f"MoneyPuck team-game situations changed: {sorted(situations)}")

    normalized = filtered.select(
        pl.col("gameId").cast(pl.Int64).alias("source_game_id"),
        (pl.col("season").cast(pl.Int64) * 10_000 + pl.col("season").cast(pl.Int64) + 1).alias(
            "season_id"
        ),
        canonical_team_expression("playerTeam"),
        canonical_team_expression(
            "opposingTeam",
            alias="canonical_opponent_abbrev",
        ),
        "situation",
        (pl.col("home_or_away") == "HOME").alias("is_home"),
        pl.col("playoffGame").cast(pl.Boolean).alias("playoff_game"),
        pl.col("gameDate").cast(pl.String).str.strptime(pl.Date, "%Y%m%d").alias("game_date"),
        pl.col("iceTime").cast(pl.Float64).alias("ice_time_seconds"),
        pl.col("xGoalsPercentage").cast(pl.Float64).alias("x_goals_percentage"),
        pl.col("corsiPercentage").cast(pl.Float64).alias("corsi_percentage"),
        pl.col("fenwickPercentage").cast(pl.Float64).alias("fenwick_percentage"),
        pl.col("xGoalsFor").cast(pl.Float64).alias("x_goals_for"),
        pl.col("xGoalsAgainst").cast(pl.Float64).alias("x_goals_against"),
        pl.col("flurryAdjustedxGoalsFor").cast(pl.Float64).alias("flurry_adjusted_x_goals_for"),
        pl.col("flurryAdjustedxGoalsAgainst")
        .cast(pl.Float64)
        .alias("flurry_adjusted_x_goals_against"),
        pl.col("scoreVenueAdjustedxGoalsFor")
        .cast(pl.Float64)
        .alias("score_venue_adjusted_x_goals_for"),
        pl.col("scoreVenueAdjustedxGoalsAgainst")
        .cast(pl.Float64)
        .alias("score_venue_adjusted_x_goals_against"),
        pl.col("shotsOnGoalFor").cast(pl.Float64).alias("shots_on_goal_for"),
        pl.col("shotsOnGoalAgainst").cast(pl.Float64).alias("shots_on_goal_against"),
        pl.col("shotAttemptsFor").cast(pl.Float64).alias("shot_attempts_for"),
        pl.col("shotAttemptsAgainst").cast(pl.Float64).alias("shot_attempts_against"),
        pl.col("goalsFor").cast(pl.Float64).alias("goals_for"),
        pl.col("goalsAgainst").cast(pl.Float64).alias("goals_against"),
        pl.col("lowDangerxGoalsFor").cast(pl.Float64).alias("low_danger_x_goals_for"),
        pl.col("lowDangerxGoalsAgainst").cast(pl.Float64).alias("low_danger_x_goals_against"),
        pl.col("mediumDangerxGoalsFor").cast(pl.Float64).alias("medium_danger_x_goals_for"),
        pl.col("mediumDangerxGoalsAgainst").cast(pl.Float64).alias("medium_danger_x_goals_against"),
        pl.col("highDangerxGoalsFor").cast(pl.Float64).alias("high_danger_x_goals_for"),
        pl.col("highDangerxGoalsAgainst").cast(pl.Float64).alias("high_danger_x_goals_against"),
        pl.col("totalShotCreditFor").cast(pl.Float64).alias("total_shot_credit_for"),
        pl.col("totalShotCreditAgainst").cast(pl.Float64).alias("total_shot_credit_against"),
    ).sort("source_game_id", "canonical_team_abbrev", "situation")
    _reconcile(normalized)
    return normalized


def _reconcile(frame: pl.DataFrame) -> None:
    keys = ["source_game_id", "canonical_team_abbrev", "situation"]
    if frame.select(keys).n_unique() != frame.height:
        raise ValueError("duplicate MoneyPuck team-game keys")
    bad_games = (
        frame.group_by("source_game_id")
        .agg(
            pl.len().alias("rows"),
            pl.col("canonical_team_abbrev").n_unique().alias("teams"),
            pl.col("situation").n_unique().alias("situations"),
            pl.col("game_date").n_unique().alias("dates"),
        )
        .filter(
            (pl.col("rows") != 10)
            | (pl.col("teams") != 2)
            | (pl.col("situations") != 5)
            | (pl.col("dates") != 1)
        )
    )
    if bad_games.height:
        sample = bad_games.get_column("source_game_id").head(10).to_list()
        raise ValueError(f"incomplete MoneyPuck team games: {sample}")
