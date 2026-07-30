"""Normalize MoneyPuck's approved season shot archives."""

from io import BytesIO
from zipfile import BadZipFile, ZipFile

import polars as pl

from sportsball.normalization.moneypuck_seasons import canonical_team_expression

REQUIRED_COLUMNS = {
    "shotID",
    "id",
    "game_id",
    "season",
    "event",
    "period",
    "time",
    "teamCode",
    "homeTeamCode",
    "awayTeamCode",
    "isHomeTeam",
    "isPlayoffGame",
    "shooterPlayerId",
    "goalieIdForShot",
    "goal",
    "shotWasOnGoal",
    "shotType",
    "location",
    "xCord",
    "yCord",
    "xCordAdjusted",
    "yCordAdjusted",
    "shotDistance",
    "shotAngle",
    "xGoal",
    "xRebound",
    "xFroze",
    "xShotWasOnGoal",
    "xPlayStopped",
    "xPlayContinuedInZone",
    "xPlayContinuedOutsideZone",
    "shotGeneratedRebound",
    "shotRebound",
    "shotRush",
    "offWing",
    "shotOnEmptyNet",
    "homeSkatersOnIce",
    "awaySkatersOnIce",
    "homeTeamGoals",
    "awayTeamGoals",
    "timeSinceLastEvent",
    "distanceFromLastEvent",
}


def moneypuck_shot_frame(season_id: int, archive_content: bytes) -> pl.DataFrame:
    """Extract, validate, and normalize one MoneyPuck shot season."""
    start_year = season_id // 10_000
    if season_id != start_year * 10_000 + start_year + 1:
        raise ValueError(f"invalid NHL season identifier: {season_id}")
    source = _read_archive(archive_content)
    years = set(source.get_column("season").unique().to_list())
    if years != {start_year}:
        raise ValueError(f"MoneyPuck shot archive has seasons: {sorted(years)}")
    events = set(source.get_column("event").unique().to_list())
    if events != {"SHOT", "MISS", "GOAL"}:
        raise ValueError(f"MoneyPuck shot event types changed: {sorted(events)}")
    source = source.with_columns(
        pl.when(pl.col("teamCode") == pl.col("homeTeamCode"))
        .then(pl.col("awayTeamCode"))
        .otherwise(pl.col("homeTeamCode"))
        .alias("defendingTeamCode")
    )
    frame = source.select(
        (pl.col("season").cast(pl.Int64) * 1_000_000 + pl.col("game_id").cast(pl.Int64)).alias(
            "source_game_id"
        ),
        pl.col("shotID").cast(pl.Int64).alias("source_shot_id"),
        pl.col("id").cast(pl.Int64).alias("source_event_index"),
        pl.col("shooterPlayerId").cast(pl.Int64).alias("source_shooter_player_id"),
        pl.col("goalieIdForShot").cast(pl.Int64).alias("source_goalie_player_id"),
        canonical_team_expression("teamCode"),
        canonical_team_expression("defendingTeamCode", alias="canonical_defending_team_abbrev"),
        pl.col("event").str.to_lowercase().alias("event_type"),
        pl.col("period").cast(pl.Int64),
        pl.col("time").cast(pl.Int64).alias("time_in_period_seconds"),
        pl.col("isHomeTeam").cast(pl.Boolean).alias("is_home_team"),
        pl.col("isPlayoffGame").cast(pl.Boolean).alias("is_playoff_game"),
        pl.col("goal").cast(pl.Boolean).alias("is_goal"),
        pl.col("shotWasOnGoal").cast(pl.Boolean).alias("was_on_goal"),
        pl.col("shotType").alias("shot_type"),
        pl.col("location"),
        pl.col("xCord").cast(pl.Float64).alias("x_coord"),
        pl.col("yCord").cast(pl.Float64).alias("y_coord"),
        pl.col("xCordAdjusted").cast(pl.Float64).alias("x_coord_adjusted"),
        pl.col("yCordAdjusted").cast(pl.Float64).alias("y_coord_adjusted"),
        pl.col("shotDistance").cast(pl.Float64).alias("shot_distance"),
        pl.col("shotAngle").cast(pl.Float64).alias("shot_angle"),
        pl.col("xGoal").cast(pl.Float64).alias("x_goal"),
        pl.col("xRebound").cast(pl.Float64).alias("x_rebound"),
        pl.col("xFroze").cast(pl.Float64).alias("x_froze"),
        pl.col("xShotWasOnGoal").cast(pl.Float64).alias("x_shot_was_on_goal"),
        pl.col("xPlayStopped").cast(pl.Float64).alias("x_play_stopped"),
        pl.col("xPlayContinuedInZone").cast(pl.Float64).alias("x_play_continued_in_zone"),
        pl.col("xPlayContinuedOutsideZone").cast(pl.Float64).alias("x_play_continued_outside_zone"),
        pl.col("shotGeneratedRebound").cast(pl.Boolean).alias("generated_rebound"),
        pl.col("shotRebound").cast(pl.Boolean).alias("was_rebound"),
        pl.col("shotRush").cast(pl.Boolean).alias("was_rush"),
        pl.col("offWing").cast(pl.Boolean).alias("was_off_wing"),
        pl.col("shotOnEmptyNet").cast(pl.Boolean).alias("was_empty_net"),
        pl.col("homeSkatersOnIce").cast(pl.Int64).alias("home_skaters_on_ice"),
        pl.col("awaySkatersOnIce").cast(pl.Int64).alias("away_skaters_on_ice"),
        pl.col("homeTeamGoals").cast(pl.Int64).alias("home_team_goals"),
        pl.col("awayTeamGoals").cast(pl.Int64).alias("away_team_goals"),
        pl.col("timeSinceLastEvent").cast(pl.Float64).alias("time_since_last_event"),
        pl.col("distanceFromLastEvent").cast(pl.Float64).alias("distance_from_last_event"),
    ).sort("source_game_id", "source_event_index")
    _reconcile(frame)
    return frame


def _read_archive(content: bytes) -> pl.DataFrame:
    try:
        with ZipFile(BytesIO(content)) as archive:
            members = [
                m for m in archive.infolist() if not m.is_dir() and m.filename.endswith(".csv")
            ]
            if len(members) != 1:
                raise ValueError("MoneyPuck shot archive must contain exactly one CSV")
            with archive.open(members[0]) as csv_file:
                frame = pl.read_csv(
                    csv_file,
                    columns=sorted(REQUIRED_COLUMNS),
                    infer_schema_length=10_000,
                    null_values=["NA", "NaN", "nan"],
                )
    except (BadZipFile, OSError, pl.exceptions.PolarsError) as error:
        raise ValueError(f"invalid MoneyPuck shot archive: {error}") from error
    return frame


def _reconcile(frame: pl.DataFrame) -> None:
    if frame.select(["source_game_id", "source_shot_id"]).n_unique() != frame.height:
        raise ValueError("duplicate MoneyPuck game/shot IDs")
    if frame.filter(pl.col("is_goal") & ~pl.col("was_on_goal")).height:
        raise ValueError("MoneyPuck goal is not marked on goal")
