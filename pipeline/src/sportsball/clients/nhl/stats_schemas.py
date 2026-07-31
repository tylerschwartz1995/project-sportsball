"""Validated NHL Stats REST season-summary contracts."""

from pydantic import BaseModel, ConfigDict, Field


class NhlStatsModel(BaseModel):
    """Base contract for NHL Stats REST rows."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class SkaterSeasonSummary(NhlStatsModel):
    """One all-team skater season total."""

    player_id: int = Field(alias="playerId")
    player_name: str = Field(alias="skaterFullName")
    position: str | None = Field(default=None, alias="positionCode")
    season_id: int = Field(alias="seasonId")
    team_abbrevs: str | None = Field(default=None, alias="teamAbbrevs")
    games_played: int = Field(default=0, alias="gamesPlayed")
    goals: int = 0
    assists: int = 0
    points: int = 0
    penalty_minutes: int | None = Field(default=None, alias="penaltyMinutes")
    plus_minus: int | None = Field(default=None, alias="plusMinus")
    game_winning_goals: int | None = Field(default=None, alias="gameWinningGoals")
    power_play_goals: int | None = Field(default=None, alias="ppGoals")
    power_play_points: int | None = Field(default=None, alias="ppPoints")
    shorthanded_goals: int | None = Field(default=None, alias="shGoals")
    shorthanded_points: int | None = Field(default=None, alias="shPoints")
    shots: int | None = None
    shooting_percentage: float | None = Field(default=None, alias="shootingPct")
    time_on_ice_per_game_seconds: float | None = Field(
        default=None,
        alias="timeOnIcePerGame",
    )
    faceoff_win_percentage: float | None = Field(default=None, alias="faceoffWinPct")


class GoalieSeasonSummary(NhlStatsModel):
    """One all-team goalie season total."""

    player_id: int = Field(alias="playerId")
    player_name: str = Field(alias="goalieFullName")
    season_id: int = Field(alias="seasonId")
    team_abbrevs: str | None = Field(default=None, alias="teamAbbrevs")
    games_played: int = Field(default=0, alias="gamesPlayed")
    games_started: int | None = Field(default=None, alias="gamesStarted")
    wins: int = 0
    losses: int = 0
    ties: int | None = None
    overtime_losses: int | None = Field(default=None, alias="otLosses")
    goals_against: int = Field(default=0, alias="goalsAgainst")
    goals_against_average: float | None = Field(default=None, alias="goalsAgainstAverage")
    saves: int | None = None
    shots_against: int | None = Field(default=None, alias="shotsAgainst")
    save_percentage: float | None = Field(default=None, alias="savePct")
    shutouts: int = 0
    time_on_ice_seconds: int | None = Field(default=None, alias="timeOnIce")


class TeamSeasonSummary(NhlStatsModel):
    """One team season total."""

    team_id: int = Field(alias="teamId")
    team_name: str = Field(alias="teamFullName")
    season_id: int = Field(alias="seasonId")
    games_played: int = Field(default=0, alias="gamesPlayed")
    wins: int = 0
    losses: int = 0
    ties: int | None = None
    overtime_losses: int | None = Field(default=None, alias="otLosses")
    points: int = 0
    point_percentage: float | None = Field(default=None, alias="pointPct")
    goals_for: int = Field(default=0, alias="goalsFor")
    goals_against: int = Field(default=0, alias="goalsAgainst")
    regulation_and_overtime_wins: int | None = Field(
        default=None,
        alias="regulationAndOtWins",
    )
    shots_for_per_game: float | None = Field(default=None, alias="shotsForPerGame")
    shots_against_per_game: float | None = Field(default=None, alias="shotsAgainstPerGame")
    power_play_percentage: float | None = Field(default=None, alias="powerPlayPct")
    penalty_kill_percentage: float | None = Field(default=None, alias="penaltyKillPct")
