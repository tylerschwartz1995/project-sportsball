"""Audit database mappings."""

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from sportsball.operations.run_context import parent_run_id
from sportsball.persistence.models.base import Base


class IngestionRun(Base):
    """Auditable execution of one pipeline job."""

    __tablename__ = "ingestion_runs"
    __table_args__ = (
        Index("ix_ingestion_runs_job_started_at", "job_name", "started_at"),
        Index("ix_ingestion_runs_status_started_at", "status", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingestion_runs.id", ondelete="SET NULL"),
        default=lambda: parent_run_id.get(),
        index=True,
    )
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


class SourceArtifact(Base):
    """Original downloaded file with provenance, checksum, and bytes."""

    __tablename__ = "source_artifacts"
    __table_args__ = (
        CheckConstraint(
            "(content IS NOT NULL AND s3_bucket IS NULL AND s3_key IS NULL "
            "AND s3_version_id IS NULL) OR (content IS NULL AND s3_bucket IS NOT NULL "
            "AND s3_key IS NOT NULL AND s3_version_id IS NOT NULL)",
            name="ck_source_artifact_storage",
        ),
        UniqueConstraint(
            "provider",
            "resource_type",
            "source_key",
            "checksum",
            name="uq_source_artifact_identity",
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
    source_url: Mapped[str] = mapped_column(String(500))
    checksum: Mapped[str] = mapped_column(String(64))
    content_type: Mapped[str | None] = mapped_column(String(100))
    content_length: Mapped[int] = mapped_column(BigInteger)
    content: Mapped[bytes | None] = mapped_column(LargeBinary)
    s3_bucket: Mapped[str | None] = mapped_column(String(63))
    s3_key: Mapped[str | None] = mapped_column(String(1024))
    s3_version_id: Mapped[str | None] = mapped_column(String(1024))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


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


class PlayByPlayBackfillGame(Base):
    """Durable processing state for one game's historical event import."""

    __tablename__ = "play_by_play_backfill_games"

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


class PlayerProfileBackfillPlayer(Base):
    """Durable processing state for one player's profile import."""

    __tablename__ = "player_profile_backfill_players"

    player_id: Mapped[int] = mapped_column(
        ForeignKey("players.id"),
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


class MoneyPuckSeasonBackfill(Base):
    """Durable processing state for one MoneyPuck season summary."""

    __tablename__ = "moneypuck_season_backfills"

    season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id"),
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


class MoneyPuckPlayerGameBackfill(Base):
    """Durable processing state for one MoneyPuck player-game season."""

    __tablename__ = "moneypuck_player_game_backfills"

    season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id"),
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


class MoneyPuckShotBackfill(Base):
    """Durable processing state for one MoneyPuck shot season."""

    __tablename__ = "moneypuck_shot_backfills"

    season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id"), primary_key=True, autoincrement=False
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


class MoneyPuckLineBackfill(Base):
    """Durable processing state for one MoneyPuck line-game season."""

    __tablename__ = "moneypuck_line_backfills"

    season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id"), primary_key=True, autoincrement=False
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
