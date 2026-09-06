"""Entities database mappings."""

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from sportsball.persistence.models.base import Base


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


class DraftSelection(Base):
    """One official NHL draft selection, including non-NHL players."""

    __tablename__ = "draft_selections"
    __table_args__ = (
        UniqueConstraint("nhl_record_id", name="uq_draft_selections_nhl_record"),
        UniqueConstraint(
            "draft_year",
            "overall_pick_number",
            name="uq_draft_selections_year_overall_pick",
        ),
        CheckConstraint("round_number > 0", name="ck_draft_selections_round"),
        CheckConstraint("pick_in_round > 0", name="ck_draft_selections_pick_in_round"),
        CheckConstraint(
            "overall_pick_number > 0",
            name="ck_draft_selections_overall_pick",
        ),
        Index(
            "ix_draft_selections_year_team",
            "draft_year",
            "drafting_team_abbrev",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nhl_record_id: Mapped[int] = mapped_column(Integer)
    draft_master_id: Mapped[int] = mapped_column(Integer)
    draft_year: Mapped[int] = mapped_column(SmallInteger, index=True)
    draft_date: Mapped[date] = mapped_column(Date)
    round_number: Mapped[int] = mapped_column(SmallInteger)
    pick_in_round: Mapped[int] = mapped_column(SmallInteger)
    overall_pick_number: Mapped[int] = mapped_column(SmallInteger)
    drafting_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))
    drafting_team_nhl_id: Mapped[int] = mapped_column(Integer)
    drafting_team_abbrev: Mapped[str] = mapped_column(String(10))
    original_pick_owner_abbrev: Mapped[str] = mapped_column(String(10))
    pick_owner_history: Mapped[str] = mapped_column(String(100))
    player_id: Mapped[int | None] = mapped_column(ForeignKey("players.id"), index=True)
    nhl_player_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    central_scouting_player_id: Mapped[int | None] = mapped_column(Integer)
    player_name: Mapped[str] = mapped_column(String(200))
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    position: Mapped[str | None] = mapped_column(String(10))
    country_code: Mapped[str | None] = mapped_column(String(10))
    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_place: Mapped[str | None] = mapped_column(String(150))
    height_in_inches: Mapped[int | None] = mapped_column(SmallInteger)
    weight_in_pounds: Mapped[int | None] = mapped_column(SmallInteger)
    shoots_catches: Mapped[str | None] = mapped_column(String(2))
    amateur_league: Mapped[str | None] = mapped_column(String(50))
    amateur_club_name: Mapped[str | None] = mapped_column(String(150))
    supplemental_draft: Mapped[bool] = mapped_column(Boolean, default=False)
    removed_outright: Mapped[bool] = mapped_column(Boolean, default=False)
    removed_outright_reason: Mapped[str | None] = mapped_column(String(200))
