"""Contracts, client pagination, and normalization for NHL draft boards."""

import hashlib
import json

import httpx
import polars as pl

from sportsball.clients.nhl.records_client import NhlRecordsClient
from sportsball.clients.nhl.records_schemas import DraftSelectionRow
from sportsball.normalization.drafts import draft_selection_frame


def test_records_client_fetches_and_combines_a_complete_draft() -> None:
    rows = [
        _draft_row(19569, 1, 8485366, "Matthew Schaefer", "NYI", "NYI"),
        _draft_row(19570, 2, 8485402, "Michael Misa", "SJS", "FLA-SJS"),
    ]
    requested_starts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/site/api/draft"
        assert request.url.params["cayenneExp"] == "draftYear=2025"
        assert request.url.params["limit"] == "1"
        requested_starts.append(request.url.params["start"])
        start = int(request.url.params["start"])
        return httpx.Response(200, json={"data": rows[start : start + 1], "total": 2})

    client = NhlRecordsClient(
        client=httpx.Client(
            base_url="https://example.test/site/api",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
        page_size=1,
    )
    fetched = client.fetch_draft(2025)
    combined = {"data": rows, "total": 2}
    content = json.dumps(combined, separators=(",", ":"), sort_keys=True).encode()

    assert requested_starts == ["0", "1"]
    assert [row.player_name for row in fetched.rows] == [
        "Matthew Schaefer",
        "Michael Misa",
    ]
    assert fetched.checksum == hashlib.sha256(content).hexdigest()


def test_draft_normalization_preserves_pick_ownership_and_nullable_player() -> None:
    rows = (
        DraftSelectionRow.model_validate(
            _draft_row(19569, 1, None, "Unsigned Prospect", "ANA", "DET-STL-ANA")
        ),
    )

    normalized = draft_selection_frame(rows, 2025)
    row = normalized.rows.row(0, named=True)

    assert normalized.rows.schema["birth_date"] == pl.Date
    assert row["nhl_player_id"] is None
    assert row["drafting_team_abbrev"] == "ANA"
    assert row["original_pick_owner_abbrev"] == "DET"
    assert row["pick_owner_history"] == "DET-STL-ANA"
    assert row["removed_outright"] is False


def test_draft_normalization_supports_legacy_pick_ownership_prose() -> None:
    source = _draft_row(
        19569,
        1,
        8485366,
        "Legacy Prospect",
        "DAL",
        "DAL (from MIN)",
    )
    normalized = draft_selection_frame(
        (DraftSelectionRow.model_validate(source),),
        2025,
    )

    assert normalized.rows["original_pick_owner_abbrev"].item() == "MIN"
    assert normalized.rows["pick_owner_history"].item() == "DAL (from MIN)"


def test_draft_normalization_rejects_duplicate_overall_picks() -> None:
    rows = (
        DraftSelectionRow.model_validate(_draft_row(19569, 1, 8485366, "Player One", "NYI", "NYI")),
        DraftSelectionRow.model_validate(_draft_row(19570, 1, 8485402, "Player Two", "SJS", "SJS")),
    )

    try:
        draft_selection_frame(rows, 2025)
    except ValueError as error:
        assert "duplicate overall picks" in str(error)
    else:
        raise AssertionError("duplicate overall draft picks must fail")


def _draft_row(
    record_id: int,
    overall_pick: int,
    player_id: int | None,
    player_name: str,
    team_abbrev: str,
    team_pick_history: str,
) -> dict[str, object]:
    first_name, last_name = player_name.split(" ", maxsplit=1)
    return {
        "id": record_id,
        "draftMasterId": 73,
        "draftYear": 2025,
        "draftDate": "2025-06-27",
        "roundNumber": 1,
        "pickInRound": overall_pick,
        "overallPickNumber": overall_pick,
        "draftedByTeamId": 2,
        "triCode": team_abbrev,
        "teamPickHistory": team_pick_history,
        "playerId": player_id,
        "csPlayerId": None,
        "playerName": player_name,
        "firstName": first_name,
        "lastName": last_name,
        "position": "D",
        "countryCode": "CAN",
        "birthDate": "2007-09-05",
        "birthPlace": "Hamilton, ON",
        "height": 74,
        "weight": 186,
        "shootsCatches": "L",
        "amateurLeague": "OHL",
        "amateurClubName": "Erie",
        "supplementalDraft": "N",
        "removedOutright": "N",
        "removedOutrightWhy": None,
    }
