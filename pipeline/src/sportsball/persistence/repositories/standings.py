"""Transactional persistence for NHL-published standings snapshots."""

from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.normalization.standings import NormalizedStandings
from sportsball.persistence.models import OfficialStandingsSnapshot, TeamSeason


class OfficialStandingsRepository:
    """Replace one complete standings date without changing team identity."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, normalized: NormalizedStandings) -> int:
        """Map season-specific abbreviations and replace the snapshot."""
        rows = normalized.rows.to_dicts()
        abbreviations = {str(row["source_team_abbrev"]) for row in rows}
        team_ids = {
            abbreviation: team_id
            for abbreviation, team_id in self._session.execute(
                select(TeamSeason.abbreviation, TeamSeason.team_id).where(
                    TeamSeason.season_id == normalized.season_id,
                    TeamSeason.abbreviation.in_(abbreviations),
                )
            ).tuples()
        }
        missing = abbreviations - team_ids.keys()
        if missing:
            raise ValueError(
                f"standings teams missing season identities for "
                f"{normalized.season_id}: {sorted(missing)}"
            )

        self._session.execute(
            delete(OfficialStandingsSnapshot).where(
                OfficialStandingsSnapshot.snapshot_date == normalized.snapshot_date
            )
        )
        self._session.execute(
            insert(OfficialStandingsSnapshot).values(
                [self._snapshot_values(row, team_ids) for row in rows]
            )
        )
        return len(rows)

    @staticmethod
    def _snapshot_values(
        row: dict[str, Any],
        team_ids: dict[str, int],
    ) -> dict[str, Any]:
        source_abbrev = str(row.pop("source_team_abbrev"))
        return {
            "team_id": team_ids[source_abbrev],
            **row,
        }
