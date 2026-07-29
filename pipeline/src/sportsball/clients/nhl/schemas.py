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


class StandingsTeam(NhlModel):
    """One team's official NHL standings row for a snapshot date."""

    season_id: int = Field(alias="seasonId")
    game_type_id: int = Field(alias="gameTypeId")
    date: date
    team_name: LocalizedName = Field(alias="teamName")
    team_common_name: LocalizedName = Field(alias="teamCommonName")
    team_abbrev: LocalizedName = Field(alias="teamAbbrev")
    place_name: LocalizedName = Field(alias="placeName")
    conference_name: str | None = Field(default=None, alias="conferenceName")
    division_name: str | None = Field(default=None, alias="divisionName")
    games_played: int = Field(alias="gamesPlayed")
    wins: int
    losses: int
    ties: int = 0
    ot_losses: int = Field(default=0, alias="otLosses")
    points: int
    regulation_wins: int = Field(default=0, alias="regulationWins")
    regulation_plus_ot_wins: int = Field(default=0, alias="regulationPlusOtWins")
    shootout_wins: int = Field(default=0, alias="shootoutWins")
    shootout_losses: int = Field(default=0, alias="shootoutLosses")
    goals_for: int = Field(alias="goalFor")
    goals_against: int = Field(alias="goalAgainst")
    goal_differential: int = Field(alias="goalDifferential")
    point_percentage: float = Field(alias="pointPctg")
    win_percentage: float = Field(alias="winPctg")
    league_sequence: int = Field(alias="leagueSequence")
    conference_sequence: int | None = Field(default=None, alias="conferenceSequence")
    division_sequence: int | None = Field(default=None, alias="divisionSequence")
    wildcard_sequence: int | None = Field(default=None, alias="wildcardSequence")
    clinch_indicator: str | None = Field(default=None, alias="clinchIndicator")


class StandingsResponse(NhlModel):
    """Validated official standings snapshot from the NHL."""

    standings: list[StandingsTeam]


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


class PeriodDescriptor(NhlModel):
    """Period identity embedded in an NHL game event."""

    number: int
    period_type: str = Field(alias="periodType")
    max_regulation_periods: int = Field(alias="maxRegulationPeriods")


class PlayByPlayDetails(NhlModel):
    """Known optional fields from event-specific NHL details."""

    event_owner_team_id: int | None = Field(default=None, alias="eventOwnerTeamId")
    x_coord: int | None = Field(default=None, alias="xCoord")
    y_coord: int | None = Field(default=None, alias="yCoord")
    zone_code: str | None = Field(default=None, alias="zoneCode")
    shot_type: str | None = Field(default=None, alias="shotType")
    reason: str | None = None
    secondary_reason: str | None = Field(default=None, alias="secondaryReason")
    type_code: str | None = Field(default=None, alias="typeCode")
    desc_key: str | None = Field(default=None, alias="descKey")
    duration: int | None = None
    goal_in_game: int | None = Field(default=None, alias="goalInGame")
    away_score: int | None = Field(default=None, alias="awayScore")
    home_score: int | None = Field(default=None, alias="homeScore")
    away_sog: int | None = Field(default=None, alias="awaySOG")
    home_sog: int | None = Field(default=None, alias="homeSOG")
    scoring_player_id: int | None = Field(default=None, alias="scoringPlayerId")
    assist1_player_id: int | None = Field(default=None, alias="assist1PlayerId")
    assist2_player_id: int | None = Field(default=None, alias="assist2PlayerId")
    shooting_player_id: int | None = Field(default=None, alias="shootingPlayerId")
    goalie_in_net_id: int | None = Field(default=None, alias="goalieInNetId")
    blocking_player_id: int | None = Field(default=None, alias="blockingPlayerId")
    committed_by_player_id: int | None = Field(default=None, alias="committedByPlayerId")
    drawn_by_player_id: int | None = Field(default=None, alias="drawnByPlayerId")
    served_by_player_id: int | None = Field(default=None, alias="servedByPlayerId")
    hitting_player_id: int | None = Field(default=None, alias="hittingPlayerId")
    hittee_player_id: int | None = Field(default=None, alias="hitteePlayerId")
    winning_player_id: int | None = Field(default=None, alias="winningPlayerId")
    losing_player_id: int | None = Field(default=None, alias="losingPlayerId")
    player_id: int | None = Field(default=None, alias="playerId")


class PlayByPlayEvent(NhlModel):
    """One validated event in chronological game order."""

    event_id: int = Field(alias="eventId")
    period_descriptor: PeriodDescriptor = Field(alias="periodDescriptor")
    time_in_period: str = Field(alias="timeInPeriod")
    time_remaining: str = Field(alias="timeRemaining")
    situation_code: str | None = Field(default=None, alias="situationCode")
    home_team_defending_side: str | None = Field(
        default=None,
        alias="homeTeamDefendingSide",
    )
    type_code: int = Field(alias="typeCode")
    type_desc_key: str = Field(alias="typeDescKey")
    sort_order: int = Field(alias="sortOrder")
    details: PlayByPlayDetails = Field(default_factory=PlayByPlayDetails)


class PlayByPlayRosterSpot(NhlModel):
    """Player identity fields embedded in a play-by-play response."""

    team_id: int = Field(alias="teamId")
    player_id: int = Field(alias="playerId")
    first_name: LocalizedName = Field(alias="firstName")
    last_name: LocalizedName = Field(alias="lastName")
    sweater_number: int | None = Field(default=None, alias="sweaterNumber")
    position_code: str | None = Field(default=None, alias="positionCode")


class PlayByPlayResponse(NhlModel):
    """Validated subset of an NHL game-center play-by-play response."""

    id: int
    season: int
    game_type: int = Field(alias="gameType")
    game_date: date = Field(alias="gameDate")
    game_state: str = Field(alias="gameState")
    roster_spots: list[PlayByPlayRosterSpot] = Field(alias="rosterSpots")
    plays: list[PlayByPlayEvent]


class PlayerDraftDetails(NhlModel):
    """Draft fields exposed on an NHL player landing response."""

    year: int
    team_abbrev: str = Field(alias="teamAbbrev")
    round: int
    pick_in_round: int = Field(alias="pickInRound")
    overall_pick: int = Field(alias="overallPick")


class PlayerSeasonTotal(NhlModel):
    """One NHL landing-page team split for a player's season."""

    season: int
    game_type_id: int = Field(alias="gameTypeId")
    league_abbrev: str = Field(alias="leagueAbbrev")
    team_name: LocalizedName = Field(alias="teamName")
    sequence: int
    games_played: int = Field(default=0, alias="gamesPlayed")
    goals: int | None = None
    assists: int | None = None
    points: int | None = None
    penalty_minutes: int | None = Field(default=None, alias="pim")
    plus_minus: int | None = Field(default=None, alias="plusMinus")
    average_time_on_ice: str | None = Field(default=None, alias="avgToi")
    faceoff_win_percentage: float | None = Field(
        default=None,
        alias="faceoffWinningPctg",
    )
    game_winning_goals: int | None = Field(default=None, alias="gameWinningGoals")
    overtime_goals: int | None = Field(default=None, alias="otGoals")
    power_play_goals: int | None = Field(default=None, alias="powerPlayGoals")
    power_play_points: int | None = Field(default=None, alias="powerPlayPoints")
    shorthanded_goals: int | None = Field(default=None, alias="shorthandedGoals")
    shorthanded_points: int | None = Field(default=None, alias="shorthandedPoints")
    shots: int | None = None
    shooting_percentage: float | None = Field(default=None, alias="shootingPctg")
    games_started: int | None = Field(default=None, alias="gamesStarted")
    wins: int | None = None
    losses: int | None = None
    ties: int | None = None
    overtime_losses: int | None = Field(default=None, alias="otLosses")
    goals_against: int | None = Field(default=None, alias="goalsAgainst")
    goals_against_average: float | None = Field(default=None, alias="goalsAgainstAvg")
    shots_against: int | None = Field(default=None, alias="shotsAgainst")
    save_percentage: float | None = Field(default=None, alias="savePctg")
    shutouts: int | None = None
    time_on_ice: str | None = Field(default=None, alias="timeOnIce")


class PlayerProfileResponse(NhlModel):
    """Validated canonical identity fields from an NHL player landing page."""

    player_id: int = Field(alias="playerId")
    first_name: LocalizedName = Field(alias="firstName")
    last_name: LocalizedName = Field(alias="lastName")
    birth_date: date | None = Field(default=None, alias="birthDate")
    birth_city: LocalizedName | None = Field(default=None, alias="birthCity")
    birth_state_province: LocalizedName | None = Field(
        default=None,
        alias="birthStateProvince",
    )
    birth_country: str | None = Field(default=None, alias="birthCountry")
    height_in_inches: int | None = Field(default=None, alias="heightInInches")
    weight_in_pounds: int | None = Field(default=None, alias="weightInPounds")
    shoots_catches: str | None = Field(default=None, alias="shootsCatches")
    position: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")
    current_team_id: int | None = Field(default=None, alias="currentTeamId")
    sweater_number: int | None = Field(default=None, alias="sweaterNumber")
    player_slug: str | None = Field(default=None, alias="playerSlug")
    draft_details: PlayerDraftDetails | None = Field(
        default=None,
        alias="draftDetails",
    )
    season_totals: list[PlayerSeasonTotal] = Field(
        default_factory=list,
        alias="seasonTotals",
    )
