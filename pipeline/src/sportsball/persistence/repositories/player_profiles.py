"""Persistence for canonical NHL player profiles."""

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from sportsball.normalization.player_profiles import NormalizedPlayerProfile
from sportsball.persistence.models import Player, Team


class PlayerProfileRepository:
    """Update one existing canonical player from a landing response."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def update(self, profile: NormalizedPlayerProfile) -> None:
        """Replace provider-owned profile fields."""
        player_id = self._session.scalar(
            select(Player.id).where(Player.nhl_id == profile.source_player_id)
        )
        if player_id is None:
            raise ValueError(
                f"player {profile.source_player_id} must exist before profile ingestion"
            )
        current_team_id = None
        if profile.source_current_team_id is not None:
            current_team_id = self._session.scalar(
                select(Team.id).where(Team.nhl_id == profile.source_current_team_id)
            )
            if current_team_id is None:
                raise ValueError(f"current team {profile.source_current_team_id} is not canonical")
        values = {
            field: getattr(profile, field)
            for field in (
                "display_name",
                "first_name",
                "last_name",
                "birth_date",
                "birth_city",
                "birth_state_province",
                "birth_country",
                "height_in_inches",
                "weight_in_pounds",
                "shoots_catches",
                "position",
                "is_active",
                "sweater_number",
                "player_slug",
                "draft_year",
                "draft_team_abbrev",
                "draft_round",
                "draft_pick_in_round",
                "draft_overall_pick",
            )
        }
        self._session.execute(
            update(Player)
            .where(Player.id == player_id)
            .values(
                **values,
                current_team_id=current_team_id,
                profile_updated_at=datetime.now(UTC),
            )
        )
