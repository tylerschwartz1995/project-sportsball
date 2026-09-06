"""Season stats database mappings."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    SmallInteger,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from sportsball.persistence.models.base import Base


class SkaterSeasonStats(Base):
    """Polars-derived traditional skater totals for one season and game type."""

    __tablename__ = "skater_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_skater_season_stats_season_type_player",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    games_played: Mapped[int] = mapped_column(SmallInteger)
    teams_played_for: Mapped[int] = mapped_column(SmallInteger)
    goals: Mapped[int] = mapped_column(SmallInteger)
    assists: Mapped[int] = mapped_column(SmallInteger)
    points: Mapped[int] = mapped_column(SmallInteger)
    plus_minus: Mapped[int] = mapped_column(SmallInteger)
    penalty_minutes: Mapped[int] = mapped_column(Integer)
    hits: Mapped[int] = mapped_column(Integer)
    power_play_goals: Mapped[int] = mapped_column(SmallInteger)
    shots_on_goal: Mapped[int] = mapped_column(Integer)
    blocked_shots: Mapped[int] = mapped_column(Integer)
    giveaways: Mapped[int] = mapped_column(Integer)
    takeaways: Mapped[int] = mapped_column(Integer)
    shifts: Mapped[int] = mapped_column(Integer)
    time_on_ice_seconds: Mapped[int | None] = mapped_column(Integer)
    time_on_ice_games: Mapped[int] = mapped_column(SmallInteger)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class GoalieSeasonStats(Base):
    """Polars-derived participating-goalie totals for one season and game type."""

    __tablename__ = "goalie_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_goalie_season_stats_season_type_player",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    games_played: Mapped[int] = mapped_column(SmallInteger)
    teams_played_for: Mapped[int] = mapped_column(SmallInteger)
    games_started: Mapped[int] = mapped_column(SmallInteger)
    wins: Mapped[int] = mapped_column(SmallInteger)
    losses: Mapped[int] = mapped_column(SmallInteger)
    overtime_losses: Mapped[int] = mapped_column(SmallInteger)
    goals_against: Mapped[int] = mapped_column(Integer)
    shots_against: Mapped[int] = mapped_column(Integer)
    saves: Mapped[int] = mapped_column(Integer)
    save_percentage: Mapped[float | None] = mapped_column(Float)
    even_strength_goals_against: Mapped[int] = mapped_column(Integer)
    even_strength_saves: Mapped[int] = mapped_column(Integer)
    even_strength_shots_against: Mapped[int] = mapped_column(Integer)
    power_play_goals_against: Mapped[int] = mapped_column(Integer)
    power_play_saves: Mapped[int] = mapped_column(Integer)
    power_play_shots_against: Mapped[int] = mapped_column(Integer)
    shorthanded_goals_against: Mapped[int] = mapped_column(Integer)
    shorthanded_saves: Mapped[int] = mapped_column(Integer)
    shorthanded_shots_against: Mapped[int] = mapped_column(Integer)
    penalty_minutes: Mapped[int] = mapped_column(Integer)
    time_on_ice_seconds: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class TeamSeasonStats(Base):
    """Polars-derived team results for one season and game type."""

    __tablename__ = "team_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "team_id",
            name="uq_team_season_stats_season_type_team",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    games_played: Mapped[int] = mapped_column(SmallInteger)
    wins: Mapped[int] = mapped_column(SmallInteger)
    losses: Mapped[int] = mapped_column(SmallInteger)
    regulation_wins: Mapped[int] = mapped_column(SmallInteger)
    overtime_wins: Mapped[int] = mapped_column(SmallInteger)
    shootout_wins: Mapped[int] = mapped_column(SmallInteger)
    regulation_losses: Mapped[int] = mapped_column(SmallInteger)
    overtime_losses: Mapped[int] = mapped_column(SmallInteger)
    shootout_losses: Mapped[int] = mapped_column(SmallInteger)
    standings_points: Mapped[int] = mapped_column(SmallInteger)
    goals_for: Mapped[int] = mapped_column(Integer)
    goals_against: Mapped[int] = mapped_column(Integer)
    shots_for: Mapped[int] = mapped_column(Integer)
    shots_against: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
