"""Canonical hockey and ingestion audit models."""

import uuid
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
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


class IngestionRun(Base):
    """Auditable execution of one pipeline job."""

    __tablename__ = "ingestion_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_name: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30))
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    records_processed: Mapped[int] = mapped_column(Integer, default=0)


class SourcePayload(Base):
    """Original provider payload with provenance and checksum."""

    __tablename__ = "source_payloads"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "resource_type",
            "source_key",
            "checksum",
            name="uq_source_payload_identity",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    ingestion_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingestion_runs.id"),
    )
    provider: Mapped[str] = mapped_column(String(50))
    resource_type: Mapped[str] = mapped_column(String(100))
    source_key: Mapped[str] = mapped_column(String(200))
    checksum: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Season(Base):
    """An NHL season identified by the provider's eight-digit season key."""

    __tablename__ = "seasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    start_year: Mapped[int] = mapped_column(SmallInteger)
    end_year: Mapped[int] = mapped_column(SmallInteger)


class Franchise(Base):
    """A stable NHL lineage spanning team relocations and renames."""

    __tablename__ = "franchises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    current_name: Mapped[str] = mapped_column(String(100))


class Team(Base):
    """One NHL source team identity belonging to a franchise lineage."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nhl_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    franchise_id: Mapped[int | None] = mapped_column(
        ForeignKey("franchises.id"),
        index=True,
    )
    abbreviation: Mapped[str] = mapped_column(String(10), index=True)
    name: Mapped[str] = mapped_column(String(100))


class TeamSeason(Base):
    """The name and abbreviation a team used in a particular season."""

    __tablename__ = "team_seasons"
    __table_args__ = (UniqueConstraint("team_id", "season_id", name="uq_team_seasons_team_season"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    abbreviation: Mapped[str] = mapped_column(String(10))
    place_name: Mapped[str | None] = mapped_column(String(100))
    common_name: Mapped[str] = mapped_column(String(100))
    full_name: Mapped[str] = mapped_column(String(200))


class TeamTransition(Base):
    """An expansion, relocation, rebrand, or asset transfer between identities."""

    __tablename__ = "team_transitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    from_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    to_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    effective_season_id: Mapped[int] = mapped_column(Integer, index=True)
    transition_type: Mapped[str] = mapped_column(String(30))
    notes: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(String(500))


class Game(Base):
    """A scheduled NHL game."""

    __tablename__ = "games"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nhl_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger)
    game_date: Mapped[date] = mapped_column(Date, index=True)
    start_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    state: Mapped[str] = mapped_column(String(20))
    away_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    home_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)


class ScheduleBackfillCheckpoint(Base):
    """Durable cursor for a season schedule backfill."""

    __tablename__ = "schedule_backfill_checkpoints"

    season_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    next_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20))
    requests_completed: Mapped[int] = mapped_column(Integer, default=0)
    games_processed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class BoxscoreBackfillGame(Base):
    """Durable processing state for one game's historical box-score import."""

    __tablename__ = "boxscore_backfill_games"

    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id"),
        primary_key=True,
        autoincrement=False,
    )
    status: Mapped[str] = mapped_column(String(20))
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Player(Base):
    """A canonical player with an NHL source identifier."""

    __tablename__ = "players"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nhl_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(10))


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
