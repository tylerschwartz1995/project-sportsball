"""Normalize MoneyPuck regular-season skater and goalie game archives."""

from dataclasses import dataclass
from io import BytesIO
from zipfile import BadZipFile, ZipFile

import polars as pl

from sportsball.normalization.moneypuck_seasons import (
    EXPECTED_SITUATIONS,
    canonical_team_expression,
)

IDENTITY_COLUMNS = {
    "playerId",
    "name",
    "gameId",
    "season",
    "playerTeam",
    "opposingTeam",
    "home_or_away",
    "gameDate",
    "situation",
    "icetime",
}
SKATER_COLUMNS = IDENTITY_COLUMNS | {
    "position",
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
    "I_F_primaryAssists",
    "I_F_secondaryAssists",
    "I_F_shotsOnGoal",
    "I_F_hits",
    "I_F_takeaways",
    "I_F_giveaways",
    "OnIce_F_xGoals",
    "OnIce_A_xGoals",
    "OnIce_F_goals",
    "OnIce_A_goals",
}
GOALIE_COLUMNS = IDENTITY_COLUMNS | {
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
    "lowDangerxGoals",
    "mediumDangerxGoals",
    "highDangerxGoals",
}


@dataclass(frozen=True)
class MoneyPuckPlayerGameFrames:
    """Normalized player-game frames for one regular season."""

    skaters: pl.DataFrame
    goalies: pl.DataFrame

    @property
    def total(self) -> int:
        return self.skaters.height + self.goalies.height


def moneypuck_player_game_frames(
    season_id: int,
    *,
    skaters_archive: bytes,
    goalies_archive: bytes,
) -> MoneyPuckPlayerGameFrames:
    """Extract, validate, and normalize one season's two player archives."""
    start_year = season_id // 10_000
    expected_season_id = start_year * 10_000 + start_year + 1
    if season_id != expected_season_id:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    skaters = _read_archive(skaters_archive, SKATER_COLUMNS, "skaters")
    goalies = _read_archive(goalies_archive, GOALIE_COLUMNS, "goalies")
    return MoneyPuckPlayerGameFrames(
        skaters=_skater_frame(skaters, season_id),
        goalies=_goalie_frame(goalies, season_id),
    )


def _read_archive(content: bytes, columns: set[str], resource: str) -> pl.DataFrame:
    try:
        with ZipFile(BytesIO(content)) as archive:
            members = [
                member
                for member in archive.infolist()
                if not member.is_dir() and member.filename.lower().endswith(".csv")
            ]
            if len(members) != 1:
                raise ValueError(f"MoneyPuck {resource} archive must contain exactly one CSV")
            with archive.open(members[0]) as source:
                frame = pl.read_csv(
                    source,
                    columns=sorted(columns),
                    infer_schema_length=10_000,
                    null_values=["NA", "NaN", "nan"],
                )
    except (BadZipFile, OSError, pl.exceptions.PolarsError) as error:
        raise ValueError(f"invalid MoneyPuck {resource} archive: {error}") from error
    missing = columns - set(frame.columns)
    if missing:
        raise ValueError(f"MoneyPuck {resource} columns missing: {sorted(missing)}")
    float_columns = [
        name for name, dtype in frame.schema.items() if dtype in (pl.Float32, pl.Float64)
    ]
    if float_columns:
        frame = frame.with_columns([pl.col(name).fill_nan(None) for name in float_columns])
    return frame


def _identity_expressions() -> list[pl.Expr]:
    return [
        pl.col("gameId").cast(pl.Int64).alias("source_game_id"),
        pl.col("playerId").cast(pl.Int64).alias("source_player_id"),
        canonical_team_expression("playerTeam"),
        canonical_team_expression(
            "opposingTeam",
            alias="canonical_opponent_abbrev",
        ),
        pl.col("situation"),
        pl.col("name"),
        (pl.col("home_or_away") == "HOME").alias("is_home"),
        pl.col("gameDate").cast(pl.String).str.strptime(pl.Date, "%Y%m%d").alias("game_date"),
        pl.col("icetime").cast(pl.Float64).alias("ice_time_seconds"),
    ]


def _skater_frame(source: pl.DataFrame, season_id: int) -> pl.DataFrame:
    _validate_source(source, season_id, "skaters")
    frame = source.select(
        *_identity_expressions(),
        pl.col("position"),
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
        pl.col("I_F_primaryAssists").cast(pl.Float64).alias("primary_assists"),
        pl.col("I_F_secondaryAssists").cast(pl.Float64).alias("secondary_assists"),
        pl.col("I_F_shotsOnGoal").cast(pl.Float64).alias("shots_on_goal"),
        pl.col("I_F_hits").cast(pl.Float64).alias("hits"),
        pl.col("I_F_takeaways").cast(pl.Float64).alias("takeaways"),
        pl.col("I_F_giveaways").cast(pl.Float64).alias("giveaways"),
        pl.col("OnIce_F_xGoals").cast(pl.Float64).alias("on_ice_x_goals_for"),
        pl.col("OnIce_A_xGoals").cast(pl.Float64).alias("on_ice_x_goals_against"),
        pl.col("OnIce_F_goals").cast(pl.Float64).alias("on_ice_goals_for"),
        pl.col("OnIce_A_goals").cast(pl.Float64).alias("on_ice_goals_against"),
    )
    _reconcile(frame, "skaters")
    return frame


def _goalie_frame(source: pl.DataFrame, season_id: int) -> pl.DataFrame:
    _validate_source(source, season_id, "goalies")
    frame = source.select(
        *_identity_expressions(),
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
        pl.col("lowDangerxGoals").cast(pl.Float64).alias("low_danger_x_goals_against"),
        pl.col("mediumDangerxGoals").cast(pl.Float64).alias("medium_danger_x_goals_against"),
        pl.col("highDangerxGoals").cast(pl.Float64).alias("high_danger_x_goals_against"),
    )
    _reconcile(frame, "goalies")
    return frame


def _validate_source(source: pl.DataFrame, season_id: int, resource: str) -> None:
    expected_year = season_id // 10_000
    years = set(source.get_column("season").unique().to_list())
    if years != {expected_year}:
        raise ValueError(f"MoneyPuck {resource} archive has seasons: {sorted(years)}")
    situations = set(source.get_column("situation").unique().to_list())
    if situations != EXPECTED_SITUATIONS:
        raise ValueError(f"MoneyPuck {resource} situations changed: {sorted(situations)}")
    non_regular = source.filter(((pl.col("gameId") // 10_000) % 100) != 2)
    if non_regular.height:
        raise ValueError(f"MoneyPuck {resource} archive contains non-regular games")


def _reconcile(frame: pl.DataFrame, resource: str) -> None:
    identity = [
        "source_game_id",
        "source_player_id",
        "canonical_team_abbrev",
    ]
    keys = [*identity, "situation"]
    if frame.select(keys).n_unique() != frame.height:
        raise ValueError(f"duplicate MoneyPuck {resource} player-game keys")
    incomplete = frame.group_by(identity).len().filter(pl.col("len") != 5)
    if incomplete.height:
        raise ValueError(f"incomplete MoneyPuck {resource} player-game situations")
