"""Validated subsets of NHL schedule responses."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class NhlModel(BaseModel):
    """Base model for provider payloads with camel-case keys."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class LocalizedName(NhlModel):
    """Localized NHL display text."""

    default: str


class ScheduleTeam(NhlModel):
    """Team fields embedded in an NHL schedule game."""

    id: int
    abbrev: str
    common_name: LocalizedName = Field(alias="commonName")


class ScheduleGame(NhlModel):
    """Game fields needed by the initial schedule ingestion slice."""

    id: int
    season: int
    game_type: int = Field(alias="gameType")
    start_time_utc: datetime = Field(alias="startTimeUTC")
    game_state: str = Field(alias="gameState")
    away_team: ScheduleTeam = Field(alias="awayTeam")
    home_team: ScheduleTeam = Field(alias="homeTeam")


class ScheduleDay(NhlModel):
    """One calendar day in a schedule response."""

    date: date
    games: list[ScheduleGame]


class ScheduleResponse(NhlModel):
    """Validated schedule response from the NHL."""

    number_of_games: int = Field(alias="numberOfGames")
    game_week: list[ScheduleDay] = Field(alias="gameWeek")
