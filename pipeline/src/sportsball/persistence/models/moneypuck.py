"""Moneypuck database mappings."""

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from sportsball.persistence.models.base import Base


class MoneyPuckSkaterSeasonStats(Base):
    """MoneyPuck skater metrics for one team, season, and situation."""

    __tablename__ = "moneypuck_skater_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "player_id",
            "team_id",
            "situation",
            name="uq_moneypuck_skater_season_player_team_situation",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    situation: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(10))
    games_played: Mapped[int] = mapped_column(SmallInteger)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    shifts: Mapped[float | None] = mapped_column(Float)
    game_score: Mapped[float | None] = mapped_column(Float)
    on_ice_x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    off_ice_x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    on_ice_corsi_percentage: Mapped[float | None] = mapped_column(Float)
    off_ice_corsi_percentage: Mapped[float | None] = mapped_column(Float)
    on_ice_fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    off_ice_fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    individual_x_goals: Mapped[float | None] = mapped_column(Float)
    individual_goals: Mapped[float | None] = mapped_column(Float)
    individual_points: Mapped[float | None] = mapped_column(Float)
    individual_shot_attempts: Mapped[float | None] = mapped_column(Float)
    on_ice_x_goals_for: Mapped[float | None] = mapped_column(Float)
    on_ice_x_goals_against: Mapped[float | None] = mapped_column(Float)
    on_ice_goals_for: Mapped[float | None] = mapped_column(Float)
    on_ice_goals_against: Mapped[float | None] = mapped_column(Float)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB)


class MoneyPuckGoalieSeasonStats(Base):
    """MoneyPuck goalie metrics for one team, season, and situation."""

    __tablename__ = "moneypuck_goalie_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "player_id",
            "team_id",
            "situation",
            name="uq_moneypuck_goalie_season_player_team_situation",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    situation: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(100))
    games_played: Mapped[int] = mapped_column(SmallInteger)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    expected_goals_against: Mapped[float | None] = mapped_column(Float)
    goals_against: Mapped[float | None] = mapped_column(Float)
    unblocked_shot_attempts_against: Mapped[float | None] = mapped_column(Float)
    expected_rebounds: Mapped[float | None] = mapped_column(Float)
    rebounds: Mapped[float | None] = mapped_column(Float)
    expected_freezes: Mapped[float | None] = mapped_column(Float)
    freezes: Mapped[float | None] = mapped_column(Float)
    expected_shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    flurry_adjusted_x_goals_against: Mapped[float | None] = mapped_column(Float)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB)


class MoneyPuckTeamSeasonStats(Base):
    """MoneyPuck team metrics for one season and situation."""

    __tablename__ = "moneypuck_team_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "team_id",
            "situation",
            name="uq_moneypuck_team_season_team_situation",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    situation: Mapped[str] = mapped_column(String(20), index=True)
    games_played: Mapped[int] = mapped_column(SmallInteger)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    corsi_percentage: Mapped[float | None] = mapped_column(Float)
    fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    x_goals_for: Mapped[float | None] = mapped_column(Float)
    x_goals_against: Mapped[float | None] = mapped_column(Float)
    goals_for: Mapped[float | None] = mapped_column(Float)
    goals_against: Mapped[float | None] = mapped_column(Float)
    shot_attempts_for: Mapped[float | None] = mapped_column(Float)
    shot_attempts_against: Mapped[float | None] = mapped_column(Float)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB)


class MoneyPuckTeamGameStats(Base):
    """MoneyPuck team advanced metrics for one game and situation."""

    __tablename__ = "moneypuck_team_game_stats"
    __table_args__ = (
        UniqueConstraint(
            "game_id",
            "team_id",
            "situation",
            name="uq_moneypuck_team_game_team_situation",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    opponent_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    situation: Mapped[str] = mapped_column(String(20), index=True)
    is_home: Mapped[bool] = mapped_column(Boolean)
    playoff_game: Mapped[bool] = mapped_column(Boolean)
    game_date: Mapped[date] = mapped_column(Date)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    corsi_percentage: Mapped[float | None] = mapped_column(Float)
    fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    x_goals_for: Mapped[float | None] = mapped_column(Float)
    x_goals_against: Mapped[float | None] = mapped_column(Float)
    flurry_adjusted_x_goals_for: Mapped[float | None] = mapped_column(Float)
    flurry_adjusted_x_goals_against: Mapped[float | None] = mapped_column(Float)
    score_venue_adjusted_x_goals_for: Mapped[float | None] = mapped_column(Float)
    score_venue_adjusted_x_goals_against: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_for: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    shot_attempts_for: Mapped[float | None] = mapped_column(Float)
    shot_attempts_against: Mapped[float | None] = mapped_column(Float)
    goals_for: Mapped[float | None] = mapped_column(Float)
    goals_against: Mapped[float | None] = mapped_column(Float)
    low_danger_x_goals_for: Mapped[float | None] = mapped_column(Float)
    low_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    medium_danger_x_goals_for: Mapped[float | None] = mapped_column(Float)
    medium_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_for: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    total_shot_credit_for: Mapped[float | None] = mapped_column(Float)
    total_shot_credit_against: Mapped[float | None] = mapped_column(Float)


class MoneyPuckSkaterGameStats(Base):
    """MoneyPuck skater metrics for one regular-season game and situation."""

    __tablename__ = "moneypuck_skater_game_stats"
    __table_args__ = (
        UniqueConstraint(
            "game_id",
            "player_id",
            "team_id",
            "situation",
            name="uq_moneypuck_skater_game_player_team_situation",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    opponent_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    situation: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(10))
    is_home: Mapped[bool] = mapped_column(Boolean)
    game_date: Mapped[date] = mapped_column(Date)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    shifts: Mapped[float | None] = mapped_column(Float)
    game_score: Mapped[float | None] = mapped_column(Float)
    on_ice_x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    off_ice_x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    on_ice_corsi_percentage: Mapped[float | None] = mapped_column(Float)
    off_ice_corsi_percentage: Mapped[float | None] = mapped_column(Float)
    on_ice_fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    off_ice_fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    individual_x_goals: Mapped[float | None] = mapped_column(Float)
    individual_goals: Mapped[float | None] = mapped_column(Float)
    individual_points: Mapped[float | None] = mapped_column(Float)
    individual_shot_attempts: Mapped[float | None] = mapped_column(Float)
    primary_assists: Mapped[float | None] = mapped_column(Float)
    secondary_assists: Mapped[float | None] = mapped_column(Float)
    shots_on_goal: Mapped[float | None] = mapped_column(Float)
    hits: Mapped[float | None] = mapped_column(Float)
    takeaways: Mapped[float | None] = mapped_column(Float)
    giveaways: Mapped[float | None] = mapped_column(Float)
    on_ice_x_goals_for: Mapped[float | None] = mapped_column(Float)
    on_ice_x_goals_against: Mapped[float | None] = mapped_column(Float)
    on_ice_goals_for: Mapped[float | None] = mapped_column(Float)
    on_ice_goals_against: Mapped[float | None] = mapped_column(Float)


class MoneyPuckGoalieGameStats(Base):
    """MoneyPuck goalie metrics for one regular-season game and situation."""

    __tablename__ = "moneypuck_goalie_game_stats"
    __table_args__ = (
        UniqueConstraint(
            "game_id",
            "player_id",
            "team_id",
            "situation",
            name="uq_moneypuck_goalie_game_player_team_situation",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    opponent_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    situation: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(100))
    is_home: Mapped[bool] = mapped_column(Boolean)
    game_date: Mapped[date] = mapped_column(Date)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    expected_goals_against: Mapped[float | None] = mapped_column(Float)
    goals_against: Mapped[float | None] = mapped_column(Float)
    unblocked_shot_attempts_against: Mapped[float | None] = mapped_column(Float)
    expected_rebounds: Mapped[float | None] = mapped_column(Float)
    rebounds: Mapped[float | None] = mapped_column(Float)
    expected_freezes: Mapped[float | None] = mapped_column(Float)
    freezes: Mapped[float | None] = mapped_column(Float)
    expected_shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    flurry_adjusted_x_goals_against: Mapped[float | None] = mapped_column(Float)
    low_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    medium_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)


class MoneyPuckShot(Base):
    """One MoneyPuck modeled shot attempt."""

    __tablename__ = "moneypuck_shots"
    __table_args__ = (
        UniqueConstraint(
            "game_id",
            "source_shot_id",
            name="uq_moneypuck_shots_game_shot",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    shooter_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), index=True)
    goalie_player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), index=True)
    shooting_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    defending_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    source_shot_id: Mapped[int] = mapped_column(BigInteger)
    source_event_index: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(20), index=True)
    period: Mapped[int] = mapped_column(SmallInteger)
    time_in_period_seconds: Mapped[int] = mapped_column(SmallInteger)
    is_home_team: Mapped[bool] = mapped_column(Boolean)
    is_playoff_game: Mapped[bool] = mapped_column(Boolean)
    is_goal: Mapped[bool] = mapped_column(Boolean)
    was_on_goal: Mapped[bool] = mapped_column(Boolean)
    shot_type: Mapped[str | None] = mapped_column(String(30))
    location: Mapped[str | None] = mapped_column(String(30))
    x_coord: Mapped[float | None] = mapped_column(Float)
    y_coord: Mapped[float | None] = mapped_column(Float)
    x_coord_adjusted: Mapped[float | None] = mapped_column(Float)
    y_coord_adjusted: Mapped[float | None] = mapped_column(Float)
    shot_distance: Mapped[float | None] = mapped_column(Float)
    shot_angle: Mapped[float | None] = mapped_column(Float)
    x_goal: Mapped[float | None] = mapped_column(Float)
    x_rebound: Mapped[float | None] = mapped_column(Float)
    x_froze: Mapped[float | None] = mapped_column(Float)
    x_shot_was_on_goal: Mapped[float | None] = mapped_column(Float)
    x_play_stopped: Mapped[float | None] = mapped_column(Float)
    x_play_continued_in_zone: Mapped[float | None] = mapped_column(Float)
    x_play_continued_outside_zone: Mapped[float | None] = mapped_column(Float)
    generated_rebound: Mapped[bool] = mapped_column(Boolean)
    was_rebound: Mapped[bool] = mapped_column(Boolean)
    was_rush: Mapped[bool] = mapped_column(Boolean)
    was_off_wing: Mapped[bool] = mapped_column(Boolean)
    was_empty_net: Mapped[bool] = mapped_column(Boolean)
    home_skaters_on_ice: Mapped[int | None] = mapped_column(SmallInteger)
    away_skaters_on_ice: Mapped[int | None] = mapped_column(SmallInteger)
    home_team_goals: Mapped[int | None] = mapped_column(SmallInteger)
    away_team_goals: Mapped[int | None] = mapped_column(SmallInteger)
    time_since_last_event: Mapped[float | None] = mapped_column(Float)
    distance_from_last_event: Mapped[float | None] = mapped_column(Float)


class MoneyPuckLineGameStats(Base):
    """MoneyPuck forward-line or defensive-pair game metrics."""

    __tablename__ = "moneypuck_line_game_stats"
    __table_args__ = (
        UniqueConstraint(
            "game_id",
            "team_id",
            "source_line_id",
            "unit_type",
            name="uq_moneypuck_line_game_team_unit",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    opponent_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    player_1_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    player_2_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    player_3_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), index=True)
    source_line_id: Mapped[str] = mapped_column(String(24))
    name: Mapped[str] = mapped_column(String(200))
    unit_type: Mapped[str] = mapped_column(String(10), index=True)
    situation: Mapped[str] = mapped_column(String(20))
    is_home: Mapped[bool] = mapped_column(Boolean)
    game_date: Mapped[date] = mapped_column(Date)
    ice_time_seconds: Mapped[float] = mapped_column(Float)
    ice_time_rank: Mapped[float | None] = mapped_column(Float)
    x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    corsi_percentage: Mapped[float | None] = mapped_column(Float)
    fenwick_percentage: Mapped[float | None] = mapped_column(Float)
    x_goals_for: Mapped[float | None] = mapped_column(Float)
    x_goals_against: Mapped[float | None] = mapped_column(Float)
    goals_for: Mapped[float | None] = mapped_column(Float)
    goals_against: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_for: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    shot_attempts_for: Mapped[float | None] = mapped_column(Float)
    shot_attempts_against: Mapped[float | None] = mapped_column(Float)
    score_venue_adjusted_x_goals_for: Mapped[float | None] = mapped_column(Float)
    score_venue_adjusted_x_goals_against: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_for: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    total_shot_credit_for: Mapped[float | None] = mapped_column(Float)
    total_shot_credit_against: Mapped[float | None] = mapped_column(Float)


class MoneyPuckUnitSeasonStats(Base):
    """Polars-derived regular-season five-on-five unit totals."""

    __tablename__ = "moneypuck_unit_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "team_id",
            "unit_type",
            "unit_key",
            name="uq_moneypuck_unit_season",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    player_1_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    player_2_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    player_3_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), index=True)
    unit_key: Mapped[str] = mapped_column(String(24))
    unit_type: Mapped[str] = mapped_column(String(10), index=True)
    derivation_version: Mapped[str] = mapped_column(String(30))
    games_played: Mapped[int] = mapped_column(Integer)
    ice_time_seconds: Mapped[float] = mapped_column(Float, index=True)
    x_goals_percentage: Mapped[float | None] = mapped_column(Float)
    corsi_percentage: Mapped[float | None] = mapped_column(Float)
    x_goals_for: Mapped[float | None] = mapped_column(Float)
    x_goals_against: Mapped[float | None] = mapped_column(Float)
    goals_for: Mapped[float | None] = mapped_column(Float)
    goals_against: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_for: Mapped[float | None] = mapped_column(Float)
    shots_on_goal_against: Mapped[float | None] = mapped_column(Float)
    shot_attempts_for: Mapped[float | None] = mapped_column(Float)
    shot_attempts_against: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_for: Mapped[float | None] = mapped_column(Float)
    high_danger_x_goals_against: Mapped[float | None] = mapped_column(Float)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
