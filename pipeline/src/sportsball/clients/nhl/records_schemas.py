"""Validated contracts for the NHL Records draft feed."""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class NhlRecordsModel(BaseModel):
    """Base contract for NHL Records rows."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class DraftSelectionRow(NhlRecordsModel):
    """One source-faithful NHL draft selection."""

    record_id: int = Field(alias="id")
    draft_master_id: int = Field(alias="draftMasterId")
    draft_year: int = Field(alias="draftYear")
    draft_date: date = Field(alias="draftDate")
    round_number: int = Field(alias="roundNumber")
    pick_in_round: int = Field(alias="pickInRound")
    overall_pick_number: int = Field(alias="overallPickNumber")
    drafted_by_team_id: int = Field(alias="draftedByTeamId")
    drafting_team_abbrev: str = Field(alias="triCode")
    team_pick_history: str = Field(alias="teamPickHistory")
    player_id: int | None = Field(default=None, alias="playerId")
    central_scouting_player_id: int | None = Field(default=None, alias="csPlayerId")
    player_name: str = Field(alias="playerName")
    first_name: str | None = Field(default=None, alias="firstName")
    last_name: str = Field(alias="lastName")
    position: str | None = None
    country_code: str | None = Field(default=None, alias="countryCode")
    birth_date: date | None = Field(default=None, alias="birthDate")
    birth_place: str | None = Field(default=None, alias="birthPlace")
    height_in_inches: int | None = Field(default=None, alias="height")
    weight_in_pounds: int | None = Field(default=None, alias="weight")
    shoots_catches: str | None = Field(default=None, alias="shootsCatches")
    amateur_league: str | None = Field(default=None, alias="amateurLeague")
    amateur_club_name: str | None = Field(default=None, alias="amateurClubName")
    supplemental_draft: str = Field(default="N", alias="supplementalDraft")
    removed_outright: str = Field(default="N", alias="removedOutright")
    removed_outright_reason: str | None = Field(
        default=None,
        alias="removedOutrightWhy",
    )
