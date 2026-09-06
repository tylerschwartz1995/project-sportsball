"""Official stats database mappings."""

from datetime import date

from sqlalchemy import (
    BigInteger,
    Date,
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


class HistoricalSkaterSeasonStats(Base):
    """NHL-published all-time skater total for one season and game type."""

    __tablename__ = "historical_skater_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_historical_skater_season_player",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_abbrevs: Mapped[str | None] = mapped_column(String(100))
    games_played: Mapped[int] = mapped_column(SmallInteger)
    goals: Mapped[int] = mapped_column(SmallInteger)
    assists: Mapped[int] = mapped_column(SmallInteger)
    points: Mapped[int] = mapped_column(SmallInteger)
    penalty_minutes: Mapped[int | None] = mapped_column(Integer)
    plus_minus: Mapped[int | None] = mapped_column(SmallInteger)
    game_winning_goals: Mapped[int | None] = mapped_column(SmallInteger)
    power_play_goals: Mapped[int | None] = mapped_column(SmallInteger)
    power_play_points: Mapped[int | None] = mapped_column(SmallInteger)
    shorthanded_goals: Mapped[int | None] = mapped_column(SmallInteger)
    shorthanded_points: Mapped[int | None] = mapped_column(SmallInteger)
    shots: Mapped[int | None] = mapped_column(Integer)
    shooting_percentage: Mapped[float | None] = mapped_column(Float)
    time_on_ice_per_game_seconds: Mapped[float | None] = mapped_column(Float)
    faceoff_win_percentage: Mapped[float | None] = mapped_column(Float)


class HistoricalGoalieSeasonStats(Base):
    """NHL-published all-time goalie total for one season and game type."""

    __tablename__ = "historical_goalie_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "player_id",
            name="uq_historical_goalie_season_player",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    team_abbrevs: Mapped[str | None] = mapped_column(String(100))
    games_played: Mapped[int] = mapped_column(SmallInteger)
    games_started: Mapped[int | None] = mapped_column(SmallInteger)
    wins: Mapped[int] = mapped_column(SmallInteger)
    losses: Mapped[int] = mapped_column(SmallInteger)
    ties: Mapped[int | None] = mapped_column(SmallInteger)
    overtime_losses: Mapped[int | None] = mapped_column(SmallInteger)
    goals_against: Mapped[int] = mapped_column(Integer)
    goals_against_average: Mapped[float | None] = mapped_column(Float)
    saves: Mapped[int | None] = mapped_column(Integer)
    shots_against: Mapped[int | None] = mapped_column(Integer)
    save_percentage: Mapped[float | None] = mapped_column(Float)
    shutouts: Mapped[int] = mapped_column(SmallInteger)
    time_on_ice_seconds: Mapped[int | None] = mapped_column(Integer)


class HistoricalTeamSeasonStats(Base):
    """NHL-published all-time team total for one season and game type."""

    __tablename__ = "historical_team_season_stats"
    __table_args__ = (
        UniqueConstraint(
            "season_id",
            "game_type",
            "nhl_team_id",
            name="uq_historical_team_season_team",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(ForeignKey("seasons.id"), index=True)
    game_type: Mapped[int] = mapped_column(SmallInteger, index=True)
    nhl_team_id: Mapped[int] = mapped_column(Integer, index=True)
    team_name: Mapped[str] = mapped_column(String(150))
    games_played: Mapped[int] = mapped_column(SmallInteger)
    wins: Mapped[int] = mapped_column(SmallInteger)
    losses: Mapped[int] = mapped_column(SmallInteger)
    ties: Mapped[int | None] = mapped_column(SmallInteger)
    overtime_losses: Mapped[int | None] = mapped_column(SmallInteger)
    points: Mapped[int] = mapped_column(SmallInteger)
    point_percentage: Mapped[float | None] = mapped_column(Float)
    goals_for: Mapped[int] = mapped_column(Integer)
    goals_against: Mapped[int] = mapped_column(Integer)
    regulation_and_overtime_wins: Mapped[int | None] = mapped_column(SmallInteger)
    shots_for_per_game: Mapped[float | None] = mapped_column(Float)
    shots_against_per_game: Mapped[float | None] = mapped_column(Float)
    power_play_percentage: Mapped[float | None] = mapped_column(Float)
    penalty_kill_percentage: Mapped[float | None] = mapped_column(Float)
