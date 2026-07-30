"""Normalize MoneyPuck season-summary CSVs with Polars."""

from dataclasses import dataclass
from io import BytesIO

import polars as pl

EXPECTED_SITUATIONS = {"all", "5on5", "5on4", "4on5", "other"}
TEAM_ALIASES = {
    "L.A": "LAK",
    "N.J": "NJD",
    "S.J": "SJS",
    "T.B": "TBL",
}


@dataclass(frozen=True)
class NormalizedMoneyPuckSeason:
    """Typed season-summary frames for all supported entity types."""

    season_id: int
    skaters: pl.DataFrame
    goalies: pl.DataFrame
    teams: pl.DataFrame


def moneypuck_season_frames(
    season_id: int,
    *,
    skaters_csv: bytes,
    goalies_csv: bytes,
    teams_csv: bytes,
) -> NormalizedMoneyPuckSeason:
    """Validate and normalize one MoneyPuck regular-season snapshot."""
    start_year = season_id // 10_000
    expected_season_id = start_year * 10_000 + start_year + 1
    if season_id != expected_season_id:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    skaters = _read_csv(skaters_csv, "skaters")
    goalies = _read_csv(goalies_csv, "goalies")
    teams = _read_csv(teams_csv, "teams")
    for label, frame in (("skaters", skaters), ("goalies", goalies), ("teams", teams)):
        source_years = set(frame.get_column("season").unique().to_list())
        if source_years != {start_year}:
            raise ValueError(
                f"MoneyPuck {label} expected season {start_year}, found {sorted(source_years)}"
            )
        situations = set(frame.get_column("situation").unique().to_list())
        if situations != EXPECTED_SITUATIONS:
            raise ValueError(f"MoneyPuck {label} situations changed: {sorted(situations)}")
    return NormalizedMoneyPuckSeason(
        season_id=season_id,
        skaters=_skater_frame(skaters),
        goalies=_goalie_frame(goalies),
        teams=_team_frame(teams),
    )


def _read_csv(content: bytes, label: str) -> pl.DataFrame:
    try:
        frame = pl.read_csv(
            BytesIO(content),
            infer_schema_length=10_000,
            null_values=["NA", "NaN", "nan"],
        )
    except Exception as error:
        raise ValueError(f"invalid MoneyPuck {label} CSV: {error}") from error
    float_columns = [
        name for name, dtype in frame.schema.items() if dtype in (pl.Float32, pl.Float64)
    ]
    if float_columns:
        frame = frame.with_columns([pl.col(name).fill_nan(None) for name in float_columns])
    return frame


def _skater_frame(source: pl.DataFrame) -> pl.DataFrame:
    required = {
        "playerId",
        "season",
        "name",
        "team",
        "position",
        "situation",
        "games_played",
        "icetime",
        "shifts",
        "gameScore",
        "onIce_xGoalsPercentage",
        "offIce_xGoalsPercentage",
        "onIce_corsiPercentage",
        "offIce_corsiPercentage",
        "onIce_fenwickPercentage",
        "offIce_fenwickPercentage",
        "I_F_xGoals",
        "I_F_goals",
        "I_F_points",
        "I_F_shotAttempts",
        "OnIce_F_xGoals",
        "OnIce_A_xGoals",
        "OnIce_F_goals",
        "OnIce_A_goals",
    }
    _require_columns(source, required, "skaters")
    normalized = source.select(
        _season_id_expression(),
        pl.col("playerId").cast(pl.Int64).alias("source_player_id"),
        canonical_team_expression(),
        "situation",
        "name",
        "position",
        pl.col("games_played").cast(pl.Int64),
        pl.col("icetime").cast(pl.Float64).alias("ice_time_seconds"),
        pl.col("shifts").cast(pl.Float64),
        pl.col("gameScore").cast(pl.Float64).alias("game_score"),
        pl.col("onIce_xGoalsPercentage").cast(pl.Float64).alias("on_ice_x_goals_percentage"),
        pl.col("offIce_xGoalsPercentage").cast(pl.Float64).alias("off_ice_x_goals_percentage"),
        pl.col("onIce_corsiPercentage").cast(pl.Float64).alias("on_ice_corsi_percentage"),
        pl.col("offIce_corsiPercentage").cast(pl.Float64).alias("off_ice_corsi_percentage"),
        pl.col("onIce_fenwickPercentage").cast(pl.Float64).alias("on_ice_fenwick_percentage"),
        pl.col("offIce_fenwickPercentage").cast(pl.Float64).alias("off_ice_fenwick_percentage"),
        pl.col("I_F_xGoals").cast(pl.Float64).alias("individual_x_goals"),
        pl.col("I_F_goals").cast(pl.Float64).alias("individual_goals"),
        pl.col("I_F_points").cast(pl.Float64).alias("individual_points"),
        pl.col("I_F_shotAttempts").cast(pl.Float64).alias("individual_shot_attempts"),
        pl.col("OnIce_F_xGoals").cast(pl.Float64).alias("on_ice_x_goals_for"),
        pl.col("OnIce_A_xGoals").cast(pl.Float64).alias("on_ice_x_goals_against"),
        pl.col("OnIce_F_goals").cast(pl.Float64).alias("on_ice_goals_for"),
        pl.col("OnIce_A_goals").cast(pl.Float64).alias("on_ice_goals_against"),
        pl.struct(source.columns).alias("metrics"),
    )
    _assert_unique(
        normalized,
        ["source_player_id", "canonical_team_abbrev", "situation"],
        "skater",
    )
    return normalized


def _goalie_frame(source: pl.DataFrame) -> pl.DataFrame:
    required = {
        "playerId",
        "season",
        "name",
        "team",
        "situation",
        "games_played",
        "icetime",
        "xGoals",
        "goals",
        "unblocked_shot_attempts",
        "xRebounds",
        "rebounds",
        "xFreeze",
        "freeze",
        "xOnGoal",
        "ongoal",
        "flurryAdjustedxGoals",
    }
    _require_columns(source, required, "goalies")
    normalized = source.select(
        _season_id_expression(),
        pl.col("playerId").cast(pl.Int64).alias("source_player_id"),
        canonical_team_expression(),
        "situation",
        "name",
        pl.col("games_played").cast(pl.Int64),
        pl.col("icetime").cast(pl.Float64).alias("ice_time_seconds"),
        pl.col("xGoals").cast(pl.Float64).alias("expected_goals_against"),
        pl.col("goals").cast(pl.Float64).alias("goals_against"),
        pl.col("unblocked_shot_attempts").cast(pl.Float64).alias("unblocked_shot_attempts_against"),
        pl.col("xRebounds").cast(pl.Float64).alias("expected_rebounds"),
        pl.col("rebounds").cast(pl.Float64),
        pl.col("xFreeze").cast(pl.Float64).alias("expected_freezes"),
        pl.col("freeze").cast(pl.Float64).alias("freezes"),
        pl.col("xOnGoal").cast(pl.Float64).alias("expected_shots_on_goal_against"),
        pl.col("ongoal").cast(pl.Float64).alias("shots_on_goal_against"),
        pl.col("flurryAdjustedxGoals").cast(pl.Float64).alias("flurry_adjusted_x_goals_against"),
        pl.struct(source.columns).alias("metrics"),
    )
    _assert_unique(
        normalized,
        ["source_player_id", "canonical_team_abbrev", "situation"],
        "goalie",
    )
    return normalized


def _team_frame(source: pl.DataFrame) -> pl.DataFrame:
    required = {
        "team",
        "season",
        "situation",
        "games_played",
        "iceTime",
        "xGoalsPercentage",
        "corsiPercentage",
        "fenwickPercentage",
        "xGoalsFor",
        "xGoalsAgainst",
        "goalsFor",
        "goalsAgainst",
        "shotAttemptsFor",
        "shotAttemptsAgainst",
    }
    _require_columns(source, required, "teams")
    normalized = source.select(
        _season_id_expression(),
        canonical_team_expression(),
        "situation",
        pl.col("games_played").cast(pl.Int64),
        pl.col("iceTime").cast(pl.Float64).alias("ice_time_seconds"),
        pl.col("xGoalsPercentage").cast(pl.Float64).alias("x_goals_percentage"),
        pl.col("corsiPercentage").cast(pl.Float64).alias("corsi_percentage"),
        pl.col("fenwickPercentage").cast(pl.Float64).alias("fenwick_percentage"),
        pl.col("xGoalsFor").cast(pl.Float64).alias("x_goals_for"),
        pl.col("xGoalsAgainst").cast(pl.Float64).alias("x_goals_against"),
        pl.col("goalsFor").cast(pl.Float64).alias("goals_for"),
        pl.col("goalsAgainst").cast(pl.Float64).alias("goals_against"),
        pl.col("shotAttemptsFor").cast(pl.Float64).alias("shot_attempts_for"),
        pl.col("shotAttemptsAgainst").cast(pl.Float64).alias("shot_attempts_against"),
        pl.struct(source.columns).alias("metrics"),
    )
    _assert_unique(normalized, ["canonical_team_abbrev", "situation"], "team")
    return normalized


def _season_id_expression() -> pl.Expr:
    return (pl.col("season").cast(pl.Int64) * 10_000 + pl.col("season").cast(pl.Int64) + 1).alias(
        "season_id"
    )


def canonical_team_expression(
    column: str = "team",
    *,
    alias: str = "canonical_team_abbrev",
) -> pl.Expr:
    """Map MoneyPuck's published team aliases to NHL season abbreviations."""
    team = pl.col(column)
    expression = team
    for source, canonical in TEAM_ALIASES.items():
        expression = pl.when(team == source).then(pl.lit(canonical)).otherwise(expression)
    return (
        pl.when((team == "ARI") & (pl.col("season") <= 2013))
        .then(pl.lit("PHX"))
        .otherwise(expression)
        .alias(alias)
    )


def _require_columns(frame: pl.DataFrame, required: set[str], label: str) -> None:
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"MoneyPuck {label} columns missing: {sorted(missing)}")


def _assert_unique(frame: pl.DataFrame, keys: list[str], label: str) -> None:
    if frame.select(keys).n_unique() != frame.height:
        raise ValueError(f"duplicate MoneyPuck {label} season keys")
