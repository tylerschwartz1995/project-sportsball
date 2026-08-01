"""Polars normalization for complete NHL draft boards."""

from dataclasses import dataclass

import polars as pl

from sportsball.clients.nhl.records_schemas import DraftSelectionRow

DRAFT_SELECTION_SCHEMA = {
    "nhl_record_id": pl.Int64,
    "draft_master_id": pl.Int64,
    "draft_year": pl.Int64,
    "draft_date": pl.Date,
    "round_number": pl.Int64,
    "pick_in_round": pl.Int64,
    "overall_pick_number": pl.Int64,
    "drafting_team_nhl_id": pl.Int64,
    "drafting_team_abbrev": pl.String,
    "original_pick_owner_abbrev": pl.String,
    "pick_owner_history": pl.String,
    "nhl_player_id": pl.Int64,
    "central_scouting_player_id": pl.Int64,
    "player_name": pl.String,
    "first_name": pl.String,
    "last_name": pl.String,
    "position": pl.String,
    "country_code": pl.String,
    "birth_date": pl.Date,
    "birth_place": pl.String,
    "height_in_inches": pl.Int64,
    "weight_in_pounds": pl.Int64,
    "shoots_catches": pl.String,
    "amateur_league": pl.String,
    "amateur_club_name": pl.String,
    "supplemental_draft": pl.Boolean,
    "removed_outright": pl.Boolean,
    "removed_outright_reason": pl.String,
}


@dataclass(frozen=True)
class NormalizedDraft:
    """One complete, validated NHL draft board."""

    draft_year: int
    rows: pl.DataFrame


def draft_selection_frame(
    rows: tuple[DraftSelectionRow, ...],
    draft_year: int,
) -> NormalizedDraft:
    """Normalize one official board while preserving source identities."""
    if not rows:
        raise ValueError(f"NHL Records returned no selections for {draft_year}")
    frame = pl.DataFrame(
        [_selection_row(row) for row in rows],
        schema=DRAFT_SELECTION_SCHEMA,
        strict=False,
    ).sort("overall_pick_number")
    if frame["draft_year"].n_unique() != 1 or frame["draft_year"].item(0) != draft_year:
        raise ValueError(f"draft response does not contain only {draft_year}")
    if frame["nhl_record_id"].n_unique() != frame.height:
        raise ValueError(f"duplicate NHL draft record IDs for {draft_year}")
    if frame["overall_pick_number"].n_unique() != frame.height:
        raise ValueError(f"duplicate overall picks for {draft_year}")
    return NormalizedDraft(draft_year=draft_year, rows=frame)


def _selection_row(row: DraftSelectionRow) -> dict[str, object]:
    owner_history = row.team_pick_history.strip()
    original_owner = _original_pick_owner(owner_history)
    return {
        "nhl_record_id": row.record_id,
        "draft_master_id": row.draft_master_id,
        "draft_year": row.draft_year,
        "draft_date": row.draft_date,
        "round_number": row.round_number,
        "pick_in_round": row.pick_in_round,
        "overall_pick_number": row.overall_pick_number,
        "drafting_team_nhl_id": row.drafted_by_team_id,
        "drafting_team_abbrev": row.drafting_team_abbrev,
        "original_pick_owner_abbrev": original_owner,
        "pick_owner_history": owner_history,
        "nhl_player_id": row.player_id,
        "central_scouting_player_id": row.central_scouting_player_id,
        "player_name": row.player_name,
        "first_name": row.first_name,
        "last_name": row.last_name,
        "position": row.position,
        "country_code": row.country_code,
        "birth_date": row.birth_date,
        "birth_place": row.birth_place,
        "height_in_inches": row.height_in_inches,
        "weight_in_pounds": row.weight_in_pounds,
        "shoots_catches": row.shoots_catches,
        "amateur_league": row.amateur_league,
        "amateur_club_name": row.amateur_club_name,
        "supplemental_draft": row.supplemental_draft == "Y",
        "removed_outright": row.removed_outright == "Y",
        "removed_outright_reason": row.removed_outright_reason,
    }


def _original_pick_owner(owner_history: str) -> str:
    prose_marker = " (from "
    if prose_marker in owner_history and owner_history.endswith(")"):
        return owner_history.split(prose_marker, maxsplit=1)[1][:-1]
    return owner_history.split("-", maxsplit=1)[0]
