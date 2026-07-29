"""Polars transformations from game facts to materialized season statistics."""

import polars as pl

SEASON_KEYS = ["season_id", "game_type", "player_id"]
SKATER_SUM_COLUMNS = [
    "goals",
    "assists",
    "points",
    "plus_minus",
    "penalty_minutes",
    "hits",
    "power_play_goals",
    "shots_on_goal",
    "blocked_shots",
    "giveaways",
    "takeaways",
    "shifts",
]
GOALIE_SUM_COLUMNS = [
    "goals_against",
    "shots_against",
    "saves",
    "even_strength_goals_against",
    "even_strength_saves",
    "even_strength_shots_against",
    "power_play_goals_against",
    "power_play_saves",
    "power_play_shots_against",
    "shorthanded_goals_against",
    "shorthanded_saves",
    "shorthanded_shots_against",
    "penalty_minutes",
    "time_on_ice_seconds",
]


def skater_season_stats_frame(game_stats: pl.DataFrame) -> pl.DataFrame:
    """Aggregate skater game facts across teams at season/game-type grain."""
    aggregated = (
        game_stats.group_by(SEASON_KEYS)
        .agg(
            pl.len().alias("games_played"),
            pl.col("team_id").n_unique().alias("teams_played_for"),
            *[pl.col(column).sum().alias(column) for column in SKATER_SUM_COLUMNS],
            pl.col("time_on_ice_seconds").sum().alias("time_on_ice_seconds"),
            pl.col("time_on_ice_seconds").count().alias("time_on_ice_games"),
        )
        .with_columns(
            pl.when(pl.col("time_on_ice_games") == pl.col("games_played"))
            .then(pl.col("time_on_ice_seconds"))
            .otherwise(None)
            .alias("time_on_ice_seconds")
        )
    )
    return aggregated.sort(SEASON_KEYS)


def goalie_season_stats_frame(game_stats: pl.DataFrame) -> pl.DataFrame:
    """Aggregate only goalies who participated, excluding dressed backups."""
    participating = game_stats.filter(
        (pl.col("time_on_ice_seconds").fill_null(0) > 0)
        | (pl.col("shots_against") > 0)
        | pl.col("decision").is_in(["W", "L", "O"])
    )
    if participating["time_on_ice_seconds"].null_count() > 0:
        raise ValueError("participating goalie rows must include time on ice")

    aggregated = participating.group_by(SEASON_KEYS).agg(
        pl.len().alias("games_played"),
        pl.col("team_id").n_unique().alias("teams_played_for"),
        pl.col("starter").cast(pl.Int64).sum().alias("games_started"),
        (pl.col("decision") == "W").sum().alias("wins"),
        (pl.col("decision") == "L").sum().alias("losses"),
        (pl.col("decision") == "O").sum().alias("overtime_losses"),
        *[pl.col(column).sum().alias(column) for column in GOALIE_SUM_COLUMNS],
    )
    return (
        aggregated.with_columns(
            pl.when(pl.col("shots_against") > 0)
            .then(pl.col("saves") / pl.col("shots_against"))
            .otherwise(None)
            .alias("save_percentage")
        )
        .select(
            *SEASON_KEYS,
            "games_played",
            "teams_played_for",
            "games_started",
            "wins",
            "losses",
            "overtime_losses",
            "goals_against",
            "shots_against",
            "saves",
            "save_percentage",
            "even_strength_goals_against",
            "even_strength_saves",
            "even_strength_shots_against",
            "power_play_goals_against",
            "power_play_saves",
            "power_play_shots_against",
            "shorthanded_goals_against",
            "shorthanded_saves",
            "shorthanded_shots_against",
            "penalty_minutes",
            "time_on_ice_seconds",
        )
        .sort(SEASON_KEYS)
    )


def team_season_stats_frame(game_stats: pl.DataFrame) -> pl.DataFrame:
    """Aggregate each team's results using its opponent's same-game record."""
    opponent_stats = game_stats.select(
        "game_id",
        pl.col("team_id").alias("opponent_team_id"),
        pl.col("score").alias("opponent_score"),
        pl.col("shots_on_goal").alias("opponent_shots_on_goal"),
    )
    paired = game_stats.join(opponent_stats, on="game_id", how="inner").filter(
        pl.col("team_id") != pl.col("opponent_team_id")
    )
    if paired.height != game_stats.height:
        raise ValueError("each game must have exactly two distinct team-stat rows")

    return (
        paired.group_by("season_id", "game_type", "team_id")
        .agg(
            pl.len().alias("games_played"),
            (pl.col("score") > pl.col("opponent_score")).sum().alias("wins"),
            (pl.col("score") < pl.col("opponent_score")).sum().alias("losses"),
            pl.col("score").sum().alias("goals_for"),
            pl.col("opponent_score").sum().alias("goals_against"),
            pl.col("shots_on_goal").sum().alias("shots_for"),
            pl.col("opponent_shots_on_goal").sum().alias("shots_against"),
        )
        .sort("season_id", "game_type", "team_id")
    )
