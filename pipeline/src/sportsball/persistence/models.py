"""Canonical hockey and ingestion audit models."""

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
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
    __table_args__ = (
        Index("ix_ingestion_runs_job_started_at", "job_name", "started_at"),
        Index("ix_ingestion_runs_status_started_at", "status", "started_at"),
    )

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


class SourceArtifact(Base):
    """Original downloaded file with provenance, checksum, and bytes."""

    __tablename__ = "source_artifacts"
    __table_args__ = (
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
    content: Mapped[bytes] = mapped_column(LargeBinary)
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


class OfficialStandingsSnapshot(Base):
    """One team's NHL-published standings totals and ranks on a date."""

    __tablename__ = "official_standings_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "snapshot_date",
            "team_id",
            name="uq_official_standings_snapshot_date_team",
        ),
        Index(
            "ix_official_standings_season_date",
            "season_id",
            "snapshot_date",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[date] = mapped_column(Date)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    game_type: Mapped[int] = mapped_column(SmallInteger)
    conference_name: Mapped[str | None] = mapped_column(String(50))
    division_name: Mapped[str | None] = mapped_column(String(50))
    games_played: Mapped[int] = mapped_column(SmallInteger)
    wins: Mapped[int] = mapped_column(SmallInteger)
    losses: Mapped[int] = mapped_column(SmallInteger)
    ties: Mapped[int] = mapped_column(SmallInteger)
    overtime_losses: Mapped[int] = mapped_column(SmallInteger)
    points: Mapped[int] = mapped_column(SmallInteger)
    regulation_wins: Mapped[int] = mapped_column(SmallInteger)
    regulation_plus_overtime_wins: Mapped[int] = mapped_column(SmallInteger)
    shootout_wins: Mapped[int] = mapped_column(SmallInteger)
    shootout_losses: Mapped[int] = mapped_column(SmallInteger)
    goals_for: Mapped[int] = mapped_column(SmallInteger)
    goals_against: Mapped[int] = mapped_column(SmallInteger)
    goal_differential: Mapped[int] = mapped_column(SmallInteger)
    point_percentage: Mapped[float] = mapped_column(Float)
    win_percentage: Mapped[float] = mapped_column(Float)
    league_rank: Mapped[int] = mapped_column(SmallInteger)
    conference_rank: Mapped[int | None] = mapped_column(SmallInteger)
    division_rank: Mapped[int | None] = mapped_column(SmallInteger)
    wildcard_rank: Mapped[int | None] = mapped_column(SmallInteger)
    clinch_indicator: Mapped[str | None] = mapped_column(String(10))


class Game(Base):
    """A scheduled NHL game."""

    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint(
            "last_period_type IS NULL OR last_period_type IN ('REG', 'OT', 'SO')",
            name="ck_games_last_period_type",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nhl_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger)
    game_date: Mapped[date] = mapped_column(Date, index=True)
    start_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    state: Mapped[str] = mapped_column(String(20))
    last_period_type: Mapped[str | None] = mapped_column(String(10))
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


class Player(Base):
    """A canonical player with an NHL source identifier."""

    __tablename__ = "players"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nhl_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(10))
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_city: Mapped[str | None] = mapped_column(String(100))
    birth_state_province: Mapped[str | None] = mapped_column(String(100))
    birth_country: Mapped[str | None] = mapped_column(String(10))
    height_in_inches: Mapped[int | None] = mapped_column(SmallInteger)
    weight_in_pounds: Mapped[int | None] = mapped_column(SmallInteger)
    shoots_catches: Mapped[str | None] = mapped_column(String(2))
    is_active: Mapped[bool | None] = mapped_column(Boolean)
    current_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    sweater_number: Mapped[int | None] = mapped_column(SmallInteger)
    player_slug: Mapped[str | None] = mapped_column(String(150))
    draft_year: Mapped[int | None] = mapped_column(SmallInteger)
    draft_team_abbrev: Mapped[str | None] = mapped_column(String(10))
    draft_round: Mapped[int | None] = mapped_column(SmallInteger)
    draft_pick_in_round: Mapped[int | None] = mapped_column(SmallInteger)
    draft_overall_pick: Mapped[int | None] = mapped_column(SmallInteger)
    profile_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


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


class OfficialSkaterSeasonStats(Base):
    """NHL-published skater team split for one season and game type."""

    __tablename__ = "official_skater_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            "sequence",
            name="uq_official_skater_season_player_sequence",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    sequence: Mapped[int] = mapped_column(SmallInteger)
    games_played: Mapped[int] = mapped_column(SmallInteger)
    goals: Mapped[int | None] = mapped_column(SmallInteger)
    assists: Mapped[int | None] = mapped_column(SmallInteger)
    points: Mapped[int | None] = mapped_column(SmallInteger)
    penalty_minutes: Mapped[int | None] = mapped_column(Integer)
    plus_minus: Mapped[int | None] = mapped_column(SmallInteger)
    average_time_on_ice: Mapped[str | None] = mapped_column(String(10))
    average_time_on_ice_seconds: Mapped[int | None] = mapped_column(Integer)
    faceoff_win_percentage: Mapped[float | None] = mapped_column(Float)
    game_winning_goals: Mapped[int | None] = mapped_column(SmallInteger)
    overtime_goals: Mapped[int | None] = mapped_column(SmallInteger)
    power_play_goals: Mapped[int | None] = mapped_column(SmallInteger)
    power_play_points: Mapped[int | None] = mapped_column(SmallInteger)
    shorthanded_goals: Mapped[int | None] = mapped_column(SmallInteger)
    shorthanded_points: Mapped[int | None] = mapped_column(SmallInteger)
    shots: Mapped[int | None] = mapped_column(Integer)
    shooting_percentage: Mapped[float | None] = mapped_column(Float)


class OfficialGoalieSeasonStats(Base):
    """NHL-published goalie team split for one season and game type."""

    __tablename__ = "official_goalie_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            "sequence",
            name="uq_official_goalie_season_player_sequence",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    sequence: Mapped[int] = mapped_column(SmallInteger)
    games_played: Mapped[int] = mapped_column(SmallInteger)
    games_started: Mapped[int | None] = mapped_column(SmallInteger)
    wins: Mapped[int | None] = mapped_column(SmallInteger)
    losses: Mapped[int | None] = mapped_column(SmallInteger)
    ties: Mapped[int | None] = mapped_column(SmallInteger)
    overtime_losses: Mapped[int | None] = mapped_column(SmallInteger)
    goals: Mapped[int | None] = mapped_column(SmallInteger)
    assists: Mapped[int | None] = mapped_column(SmallInteger)
    points: Mapped[int | None] = mapped_column(SmallInteger)
    penalty_minutes: Mapped[int | None] = mapped_column(Integer)
    time_on_ice: Mapped[str | None] = mapped_column(String(15))
    time_on_ice_seconds: Mapped[int | None] = mapped_column(Integer)
    goals_against: Mapped[int | None] = mapped_column(Integer)
    goals_against_average: Mapped[float | None] = mapped_column(Float)
    shots_against: Mapped[int | None] = mapped_column(Integer)
    save_percentage: Mapped[float | None] = mapped_column(Float)
    shutouts: Mapped[int | None] = mapped_column(SmallInteger)


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
