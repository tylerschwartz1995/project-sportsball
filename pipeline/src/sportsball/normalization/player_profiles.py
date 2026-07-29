"""Normalize one NHL player landing response."""

from dataclasses import dataclass
from datetime import date

from sportsball.clients.nhl.schemas import PlayerProfileResponse


@dataclass(frozen=True)
class NormalizedPlayerProfile:
    """Canonical player attributes ready for persistence."""

    source_player_id: int
    display_name: str
    first_name: str
    last_name: str
    birth_date: date | None
    birth_city: str | None
    birth_state_province: str | None
    birth_country: str | None
    height_in_inches: int | None
    weight_in_pounds: int | None
    shoots_catches: str | None
    position: str | None
    is_active: bool | None
    source_current_team_id: int | None
    sweater_number: int | None
    player_slug: str | None
    draft_year: int | None
    draft_team_abbrev: str | None
    draft_round: int | None
    draft_pick_in_round: int | None
    draft_overall_pick: int | None


def normalize_player_profile(
    profile: PlayerProfileResponse,
) -> NormalizedPlayerProfile:
    """Flatten localized and nested provider identity fields."""
    draft = profile.draft_details
    first_name = profile.first_name.default
    last_name = profile.last_name.default
    return NormalizedPlayerProfile(
        source_player_id=profile.player_id,
        display_name=f"{first_name} {last_name}".strip(),
        first_name=first_name,
        last_name=last_name,
        birth_date=profile.birth_date,
        birth_city=profile.birth_city.default if profile.birth_city else None,
        birth_state_province=(
            profile.birth_state_province.default if profile.birth_state_province else None
        ),
        birth_country=profile.birth_country,
        height_in_inches=profile.height_in_inches,
        weight_in_pounds=profile.weight_in_pounds,
        shoots_catches=profile.shoots_catches,
        position=profile.position,
        is_active=profile.is_active,
        source_current_team_id=profile.current_team_id,
        sweater_number=profile.sweater_number,
        player_slug=profile.player_slug,
        draft_year=draft.year if draft else None,
        draft_team_abbrev=draft.team_abbrev if draft else None,
        draft_round=draft.round if draft else None,
        draft_pick_in_round=draft.pick_in_round if draft else None,
        draft_overall_pick=draft.overall_pick if draft else None,
    )
