"""Transactional persistence for official NHL draft boards."""

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.normalization.drafts import NormalizedDraft
from sportsball.persistence.models import DraftSelection, Player, Team

INSERT_BATCH_SIZE = 1_000


class DraftSelectionRepository:
    """Replace complete draft years and resolve optional canonical links."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, drafts: Sequence[NormalizedDraft]) -> int:
        """Replace only the provided years and enrich existing NHL players."""
        if not drafts:
            return 0
        draft_years = [draft.draft_year for draft in drafts]
        if len(draft_years) != len(set(draft_years)):
            raise ValueError("duplicate draft years supplied for replacement")
        rows = [row for draft in drafts for row in draft.rows.to_dicts()]
        player_ids = self._player_ids(rows)
        team_ids = self._team_ids(rows)
        resolved = [self._resolve_row(row, player_ids, team_ids) for row in rows]

        self._session.execute(
            delete(DraftSelection).where(DraftSelection.draft_year.in_(draft_years))
        )
        for offset in range(0, len(resolved), INSERT_BATCH_SIZE):
            self._session.execute(
                insert(DraftSelection).values(resolved[offset : offset + INSERT_BATCH_SIZE])
            )
        self._update_existing_player_draft_details(draft_years)
        return len(resolved)

    def _player_ids(self, rows: list[dict[str, Any]]) -> dict[int, int]:
        source_ids = {int(row["nhl_player_id"]) for row in rows if row["nhl_player_id"] is not None}
        if not source_ids:
            return {}
        return {
            nhl_id: player_id
            for nhl_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_ids))
            ).tuples()
        }

    def _team_ids(self, rows: list[dict[str, Any]]) -> dict[int, int]:
        source_ids = {int(row["drafting_team_nhl_id"]) for row in rows}
        return {
            nhl_id: team_id
            for nhl_id, team_id in self._session.execute(
                select(Team.nhl_id, Team.id).where(Team.nhl_id.in_(source_ids))
            ).tuples()
        }

    @staticmethod
    def _resolve_row(
        source_row: dict[str, Any],
        player_ids: dict[int, int],
        team_ids: dict[int, int],
    ) -> dict[str, Any]:
        row = dict(source_row)
        nhl_player_id = row["nhl_player_id"]
        row["player_id"] = player_ids.get(int(nhl_player_id)) if nhl_player_id is not None else None
        row["drafting_team_id"] = team_ids.get(int(row["drafting_team_nhl_id"]))
        return row

    def _update_existing_player_draft_details(self, draft_years: list[int]) -> None:
        self._session.execute(
            update(Player)
            .where(Player.id == DraftSelection.player_id)
            .where(DraftSelection.draft_year.in_(draft_years))
            .values(
                draft_year=DraftSelection.draft_year,
                draft_team_abbrev=DraftSelection.drafting_team_abbrev,
                draft_round=DraftSelection.round_number,
                draft_pick_in_round=DraftSelection.pick_in_round,
                draft_overall_pick=DraftSelection.overall_pick_number,
            )
        )
