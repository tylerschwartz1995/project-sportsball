"""Durable daily work and schedule discovery progress."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from sportsball.persistence.models.base import Base


class DailyWork(Base):
    """Latest outcome of a retryable game, player, or season task."""

    __tablename__ = "daily_work"

    dataset: Mapped[str] = mapped_column(String(80), primary_key=True)
    source_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    status: Mapped[str] = mapped_column(String(20))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingestion_runs.id", ondelete="SET NULL")
    )
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    coverage: Mapped[dict[str, int | str | None]] = mapped_column(JSONB, default=dict)


class DailyScheduleCheckpoint(Base):
    """First historical schedule date still needing discovery, per season."""

    __tablename__ = "daily_schedule_checkpoints"

    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), primary_key=True)
    next_date: Mapped[date] = mapped_column(Date)
    covered_through: Mapped[date | None] = mapped_column(Date)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
