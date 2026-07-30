"""Polars transformations for season-level MoneyPuck line and pairing totals."""

import polars as pl

SUM_COLUMNS = (
    "ice_time_seconds",
    "x_goals_for",
    "x_goals_against",
    "goals_for",
    "goals_against",
    "shots_on_goal_for",
    "shots_on_goal_against",
    "shot_attempts_for",
    "shot_attempts_against",
    "high_danger_x_goals_for",
    "high_danger_x_goals_against",
)
DERIVATION_VERSION = "unit-season-v1"


def moneypuck_unit_season_frame(game_units: pl.DataFrame) -> pl.DataFrame:
    """Aggregate game units by canonical player combination, season, and team."""
    canonicalized = (
        game_units.with_columns(
            pl.concat_list("player_1_id", "player_2_id", "player_3_id")
            .list.drop_nulls()
            .list.sort()
            .alias("player_ids")
        )
        .with_columns(
            pl.col("player_ids").list.get(0).alias("player_1_id"),
            pl.col("player_ids").list.get(1).alias("player_2_id"),
            pl.col("player_ids").list.get(2, null_on_oob=True).alias("player_3_id"),
            pl.col("player_ids")
            .list.eval(pl.element().cast(pl.String))
            .list.join(":")
            .alias("unit_key"),
        )
        .drop("player_ids")
    )
    invalid_units = canonicalized.filter(
        ((pl.col("unit_type") == "line") & pl.col("player_3_id").is_null())
        | ((pl.col("unit_type") == "pairing") & pl.col("player_3_id").is_not_null())
        | ~pl.col("unit_type").is_in(["line", "pairing"])
    )
    if invalid_units.height:
        raise ValueError("season units must contain three-player lines or two-player pairings")
    canonical_game_keys = ["game_id", "team_id", "unit_type", "unit_key"]
    if canonicalized.select(canonical_game_keys).n_unique() != canonicalized.height:
        raise ValueError("duplicate canonical unit within one game")

    aggregated = canonicalized.group_by(
        "season_id",
        "team_id",
        "player_1_id",
        "player_2_id",
        "player_3_id",
        "unit_key",
        "unit_type",
    ).agg(
        pl.col("game_id").n_unique().alias("games_played"),
        *[_complete_sum(column) for column in SUM_COLUMNS],
    )
    return (
        aggregated.with_columns(
            _share("x_goals_for", "x_goals_against").alias("x_goals_percentage"),
            _share("shot_attempts_for", "shot_attempts_against").alias("corsi_percentage"),
            pl.lit(DERIVATION_VERSION).alias("derivation_version"),
        )
        .select(
            "season_id",
            "team_id",
            "player_1_id",
            "player_2_id",
            "player_3_id",
            "unit_key",
            "unit_type",
            "derivation_version",
            "games_played",
            "ice_time_seconds",
            "x_goals_percentage",
            "corsi_percentage",
            "x_goals_for",
            "x_goals_against",
            "goals_for",
            "goals_against",
            "shots_on_goal_for",
            "shots_on_goal_against",
            "shot_attempts_for",
            "shot_attempts_against",
            "high_danger_x_goals_for",
            "high_danger_x_goals_against",
        )
        .sort("season_id", "team_id", "unit_type", "unit_key")
    )


def _complete_sum(column: str) -> pl.Expr:
    return (
        pl.when(pl.col(column).is_not_null().all())
        .then(pl.col(column).sum())
        .otherwise(None)
        .alias(column)
    )


def _share(for_column: str, against_column: str) -> pl.Expr:
    total = pl.col(for_column) + pl.col(against_column)
    return (
        pl.when(
            pl.col(for_column).is_not_null() & pl.col(against_column).is_not_null() & (total > 0)
        )
        .then(pl.col(for_column) / total)
        .otherwise(None)
    )
