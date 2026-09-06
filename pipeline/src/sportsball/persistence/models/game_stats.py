"""Game stats database mappings."""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from sportsball.persistence.models.base import Base


class TeamGameStats(Base):
    """Traditional team totals from one NHL box score."""

    __tablename__ = "team_game_stats"
    __table_args__ = (UniqueConstraint("game_id", "team_id", name="uq_team_game_stats_game_team"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    is_home: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[int] = mapped_column(SmallInteger)
    shots_on_goal: Mapped[int | None] = mapped_column(SmallInteger)


class PlayerGameStats(Base):
    """Traditional skater totals from one NHL box score."""

    __tablename__ = "player_game_stats"
    __table_args__ = (
        UniqueConstraint("game_id", "player_id", name="uq_player_game_stats_game_player"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    sweater_number: Mapped[int | None] = mapped_column(SmallInteger)
    position: Mapped[str] = mapped_column(String(10))
    goals: Mapped[int] = mapped_column(SmallInteger)
    assists: Mapped[int] = mapped_column(SmallInteger)
    points: Mapped[int] = mapped_column(SmallInteger)
    plus_minus: Mapped[int] = mapped_column(SmallInteger)
    penalty_minutes: Mapped[int] = mapped_column(SmallInteger)
    hits: Mapped[int] = mapped_column(SmallInteger)
    power_play_goals: Mapped[int] = mapped_column(SmallInteger)
    shots_on_goal: Mapped[int] = mapped_column(SmallInteger)
    faceoff_win_percentage: Mapped[float | None] = mapped_column(Float)
    blocked_shots: Mapped[int] = mapped_column(SmallInteger)
    giveaways: Mapped[int] = mapped_column(SmallInteger)
    takeaways: Mapped[int] = mapped_column(SmallInteger)
    shifts: Mapped[int] = mapped_column(SmallInteger)
    time_on_ice_seconds: Mapped[int | None] = mapped_column(Integer)


class GoalieGameStats(Base):
    """Traditional goalie totals and strength splits from one box score."""

    __tablename__ = "goalie_game_stats"
    __table_args__ = (
        UniqueConstraint("game_id", "player_id", name="uq_goalie_game_stats_game_player"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    sweater_number: Mapped[int | None] = mapped_column(SmallInteger)
    starter: Mapped[bool] = mapped_column(Boolean)
    decision: Mapped[str | None] = mapped_column(String(10))
    goals_against: Mapped[int] = mapped_column(SmallInteger)
    shots_against: Mapped[int] = mapped_column(SmallInteger)
    saves: Mapped[int] = mapped_column(SmallInteger)
    save_percentage: Mapped[float | None] = mapped_column(Float)
    even_strength_goals_against: Mapped[int] = mapped_column(SmallInteger)
    even_strength_saves: Mapped[int] = mapped_column(SmallInteger)
    even_strength_shots_against: Mapped[int] = mapped_column(SmallInteger)
    power_play_goals_against: Mapped[int] = mapped_column(SmallInteger)
    power_play_saves: Mapped[int] = mapped_column(SmallInteger)
    power_play_shots_against: Mapped[int] = mapped_column(SmallInteger)
    shorthanded_goals_against: Mapped[int] = mapped_column(SmallInteger)
    shorthanded_saves: Mapped[int] = mapped_column(SmallInteger)
    shorthanded_shots_against: Mapped[int] = mapped_column(SmallInteger)
    penalty_minutes: Mapped[int] = mapped_column(SmallInteger)
    time_on_ice_seconds: Mapped[int | None] = mapped_column(Integer)


class GameEvent(Base):
    """One chronologically ordered event from an NHL play-by-play feed."""

    __tablename__ = "game_events"
    __table_args__ = (
        UniqueConstraint(
            "game_id",
            "source_event_id",
            name="uq_game_events_game_source_event",
        ),
        Index("ix_game_events_game_sort_order", "game_id", "sort_order"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"),
    )
    source_event_id: Mapped[int] = mapped_column(BigInteger)
    sort_order: Mapped[int] = mapped_column(Integer)
    period_number: Mapped[int] = mapped_column(SmallInteger)
    period_type: Mapped[str] = mapped_column(String(10))
    time_in_period: Mapped[str] = mapped_column(String(15))
    time_remaining: Mapped[str] = mapped_column(String(15))
    time_in_period_seconds: Mapped[int | None] = mapped_column(SmallInteger)
    time_remaining_seconds: Mapped[int | None] = mapped_column(SmallInteger)
    situation_code: Mapped[str | None] = mapped_column(String(10))
    home_team_defending_side: Mapped[str | None] = mapped_column(String(10))
    type_code: Mapped[int] = mapped_column(SmallInteger)
    type_desc_key: Mapped[str] = mapped_column(String(50), index=True)
    event_owner_team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id"),
        index=True,
    )
    x_coord: Mapped[int | None] = mapped_column(SmallInteger)
    y_coord: Mapped[int | None] = mapped_column(SmallInteger)
    zone_code: Mapped[str | None] = mapped_column(String(5))
    shot_type: Mapped[str | None] = mapped_column(String(30))
    reason: Mapped[str | None] = mapped_column(String(100))
    secondary_reason: Mapped[str | None] = mapped_column(String(100))
    penalty_type_code: Mapped[str | None] = mapped_column(String(10))
    penalty_desc_key: Mapped[str | None] = mapped_column(String(100))
    penalty_duration_minutes: Mapped[int | None] = mapped_column(SmallInteger)
    goal_in_game: Mapped[int | None] = mapped_column(SmallInteger)
    away_score: Mapped[int | None] = mapped_column(SmallInteger)
    home_score: Mapped[int | None] = mapped_column(SmallInteger)
    away_sog: Mapped[int | None] = mapped_column(SmallInteger)
    home_sog: Mapped[int | None] = mapped_column(SmallInteger)


class GameEventPlayer(Base):
    """A player's semantic role in one normalized game event."""

    __tablename__ = "game_event_players"
    __table_args__ = (
        UniqueConstraint(
            "game_event_id",
            "source_player_id",
            "role",
            name="uq_game_event_players_event_source_player_role",
        ),
        Index(
            "ix_game_event_players_player_role",
            "player_id",
            "role",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    game_event_id: Mapped[int] = mapped_column(
        ForeignKey("game_events.id", ondelete="CASCADE"),
    )
    source_player_id: Mapped[int] = mapped_column(BigInteger)
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"))
    role: Mapped[str] = mapped_column(String(30))
