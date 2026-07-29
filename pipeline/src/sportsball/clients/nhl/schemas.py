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
    next_start_date: date | None = Field(default=None, alias="nextStartDate")
    regular_season_start_date: date | None = Field(
        default=None,
        alias="regularSeasonStartDate",
    )
    regular_season_end_date: date | None = Field(
        default=None,
        alias="regularSeasonEndDate",
    )
    playoff_end_date: date | None = Field(default=None, alias="playoffEndDate")


class BoxscoreTeam(NhlModel):
    """Team fields embedded in a game-center box score."""

    id: int
    abbrev: str
    common_name: LocalizedName = Field(alias="commonName")
    score: int
    shots_on_goal: int | None = Field(default=None, alias="sog")


class BoxscoreSkater(NhlModel):
    """Traditional skater statistics exposed by NHL game center."""

    player_id: int = Field(alias="playerId")
    name: LocalizedName
    sweater_number: int | None = Field(default=None, alias="sweaterNumber")
    position: str
    goals: int
    assists: int
    points: int
    plus_minus: int = Field(alias="plusMinus")
    penalty_minutes: int = Field(alias="pim")
    hits: int
    power_play_goals: int = Field(alias="powerPlayGoals")
    shots_on_goal: int = Field(alias="sog")
    faceoff_win_percentage: float | None = Field(alias="faceoffWinningPctg")
    blocked_shots: int = Field(alias="blockedShots")
    giveaways: int
    takeaways: int
    shifts: int
    time_on_ice: str | None = Field(default=None, alias="toi")


class BoxscoreGoalie(NhlModel):
    """Traditional goalie statistics exposed by NHL game center."""

    player_id: int = Field(alias="playerId")
    name: LocalizedName
    sweater_number: int | None = Field(default=None, alias="sweaterNumber")
    position: str
    starter: bool = False
    decision: str | None = None
    goals_against: int = Field(default=0, alias="goalsAgainst")
    shots_against: int = Field(default=0, alias="shotsAgainst")
    saves: int = 0
    save_percentage: float | None = Field(default=None, alias="savePctg")
    even_strength_goals_against: int = Field(default=0, alias="evenStrengthGoalsAgainst")
    even_strength_shots: str = Field(default="0/0", alias="evenStrengthShotsAgainst")
    power_play_goals_against: int = Field(default=0, alias="powerPlayGoalsAgainst")
    power_play_shots: str = Field(default="0/0", alias="powerPlayShotsAgainst")
    shorthanded_goals_against: int = Field(default=0, alias="shorthandedGoalsAgainst")
    shorthanded_shots: str = Field(default="0/0", alias="shorthandedShotsAgainst")
    penalty_minutes: int = Field(default=0, alias="pim")
    time_on_ice: str | None = Field(default=None, alias="toi")


class BoxscoreTeamPlayers(NhlModel):
    """Players grouped by lineup role for one team."""

    forwards: list[BoxscoreSkater] = Field(default_factory=list)
    defense: list[BoxscoreSkater] = Field(default_factory=list)
    goalies: list[BoxscoreGoalie] = Field(default_factory=list)


class BoxscorePlayers(NhlModel):
    """Both teams' player statistics."""

    away_team: BoxscoreTeamPlayers = Field(alias="awayTeam")
    home_team: BoxscoreTeamPlayers = Field(alias="homeTeam")


class BoxscoreGameOutcome(NhlModel):
    """Provider classification of the period in which a game ended."""

    last_period_type: str = Field(alias="lastPeriodType")


class BoxscoreResponse(NhlModel):
    """Validated subset of an NHL game-center box score."""

    id: int
    season: int
    game_type: int = Field(alias="gameType")
    game_date: date = Field(alias="gameDate")
    game_state: str = Field(alias="gameState")
    game_outcome: BoxscoreGameOutcome = Field(alias="gameOutcome")
    away_team: BoxscoreTeam = Field(alias="awayTeam")
    home_team: BoxscoreTeam = Field(alias="homeTeam")
    player_stats: BoxscorePlayers = Field(alias="playerByGameStats")
