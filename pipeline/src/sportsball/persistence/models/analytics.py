"""Versioned, replaceable descriptive analytics built from retained facts."""

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from sportsball.persistence.models.base import Base


class HistoricalEraRate(Base):
    """League denominators; filters never redefine the comparison population."""

    __tablename__ = "historical_era_rates"
    season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id", ondelete="CASCADE"), primary_key=True
    )
    game_type: Mapped[int] = mapped_column(Integer, primary_key=True)
    points_per_game: Mapped[Decimal | None] = mapped_column(Numeric)
    save_percentage: Mapped[Decimal | None] = mapped_column(Numeric)
    definition_version: Mapped[str] = mapped_column(String(40))
    ingestion_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="CASCADE")
    )


class HistoricalPeakStats(Base):
    """Consecutive three/five-season windows, including team-filter eligibility."""

    __tablename__ = "historical_peak_stats"
    player_id: Mapped[int] = mapped_column(
        ForeignKey("players.id", ondelete="CASCADE"), primary_key=True
    )
    game_type: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(10), primary_key=True)
    window: Mapped[int] = mapped_column(Integer, primary_key=True)
    end_season_id: Mapped[int] = mapped_column(
        ForeignKey("seasons.id", ondelete="CASCADE"), primary_key=True
    )
    start_season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"))
    games_played: Mapped[int] = mapped_column(Integer)
    goals: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[int | None] = mapped_column(Integer)
    wins: Mapped[int | None] = mapped_column(Integer)
    shutouts: Mapped[int | None] = mapped_column(Integer)
    common_teams: Mapped[list[str]] = mapped_column(ARRAY(String))
    definition_version: Mapped[str] = mapped_column(String(40))
    ingestion_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ingestion_runs.id", ondelete="CASCADE")
    )


class ScheduleGameContext(Base):
    """Opponent results available before a game's ordering key; no predictions."""

    __tablename__ = "schedule_game_context"
    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    )
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True
    )
    opponent_prior_games: Mapped[int] = mapped_column(Integer)
    opponent_results_season_id: Mapped[int | None] = mapped_column(
        ForeignKey("seasons.id", ondelete="CASCADE")
    )
    opponent_expected_goals_season_id: Mapped[int | None] = mapped_column(
        ForeignKey("seasons.id", ondelete="CASCADE")
    )
    opponent_points_percentage: Mapped[float | None] = mapped_column(Float)
    opponent_goal_differential_per_game: Mapped[float | None] = mapped_column(Float)
    opponent_expected_goals_percentage: Mapped[float | None] = mapped_column(Float)
    rest_days: Mapped[int | None] = mapped_column(Integer)
    is_back_to_back: Mapped[bool] = mapped_column(Boolean)
    definition_version: Mapped[str] = mapped_column(String(40))
    ingestion_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID, ForeignKey("ingestion_runs.id", ondelete="CASCADE")
    )
