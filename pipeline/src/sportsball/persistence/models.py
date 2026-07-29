"""Canonical hockey and ingestion audit models."""

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
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


class Team(Base):
    """A canonical team with its stable NHL source identifier."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nhl_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    abbreviation: Mapped[str] = mapped_column(String(10), index=True)
    name: Mapped[str] = mapped_column(String(100))


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
