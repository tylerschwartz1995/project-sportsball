"""PostgreSQL integration tests for complete NHL draft ingestion."""

import os

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.nhl.records_client import NhlRecordsClient
from sportsball.ingestion.orchestration.drafts import ingest_draft_history
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    DraftSelection,
    IngestionRun,
    Player,
    SourcePayload,
    Team,
)

TEST_DRAFT_YEAR = 2099
TEST_PLAYER_NHL_ID = 8999001
TEST_TEAM_NHL_ID = 990

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_draft_ingestion_is_idempotent_audited_and_resolves_links() -> None:
    _create_dimensions()
    try:
        first = ingest_draft_history(TEST_DRAFT_YEAR, TEST_DRAFT_YEAR, _client())
        second = ingest_draft_history(TEST_DRAFT_YEAR, TEST_DRAFT_YEAR, _client())

        assert first.selections_processed == 2
        assert second.selections_processed == 2
        with session_scope() as session:
            selections = session.scalars(
                select(DraftSelection)
                .where(DraftSelection.draft_year == TEST_DRAFT_YEAR)
                .order_by(DraftSelection.overall_pick_number)
            ).all()
            assert len(selections) == 2
            assert selections[0].player_id is not None
            assert selections[0].drafting_team_id is not None
            assert selections[1].player_id is None
            assert selections[1].original_pick_owner_abbrev == "OLD"
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourcePayload)
                    .where(
                        SourcePayload.resource_type == "draft_selection",
                        SourcePayload.source_key == str(TEST_DRAFT_YEAR),
                    )
                )
                == 1
            )
            player = session.scalar(select(Player).where(Player.nhl_id == TEST_PLAYER_NHL_ID))
            assert player is not None
            assert player.draft_year == TEST_DRAFT_YEAR
            assert player.draft_overall_pick == 1
    finally:
        _clean_up()


def _client() -> NhlRecordsClient:
    payload = {
        "data": [
            _draft_row(990001, 1, TEST_PLAYER_NHL_ID, "Linked Player", "TST"),
            _draft_row(990002, 2, None, "Unsigned Prospect", "OLD-TST"),
        ],
        "total": 2,
    }
    return NhlRecordsClient(
        client=httpx.Client(
            base_url="https://example.test/site/api",
            transport=httpx.MockTransport(lambda _request: httpx.Response(200, json=payload)),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _draft_row(
    record_id: int,
    overall_pick: int,
    player_id: int | None,
    player_name: str,
    pick_history: str,
) -> dict[str, object]:
    first_name, last_name = player_name.split(" ", maxsplit=1)
    return {
        "id": record_id,
        "draftMasterId": 999,
        "draftYear": TEST_DRAFT_YEAR,
        "draftDate": "2099-06-25",
        "roundNumber": 1,
        "pickInRound": overall_pick,
        "overallPickNumber": overall_pick,
        "draftedByTeamId": TEST_TEAM_NHL_ID,
        "triCode": "TST",
        "teamPickHistory": pick_history,
        "playerId": player_id,
        "playerName": player_name,
        "firstName": first_name,
        "lastName": last_name,
        "position": "C",
        "countryCode": "CAN",
        "supplementalDraft": "N",
        "removedOutright": "N",
    }


def _create_dimensions() -> None:
    with session_scope() as session:
        session.add(
            Team(
                nhl_id=TEST_TEAM_NHL_ID,
                abbreviation="TST",
                name="Test Team",
            )
        )
        session.add(
            Player(
                nhl_id=TEST_PLAYER_NHL_ID,
                display_name="Linked Player",
                position="C",
            )
        )


def _clean_up() -> None:
    with session_scope() as session:
        run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.job_name == "ingest_draft_history",
                IngestionRun.parameters["start_year"].as_integer() == TEST_DRAFT_YEAR,
            )
        ).all()
        session.execute(delete(DraftSelection).where(DraftSelection.draft_year == TEST_DRAFT_YEAR))
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "draft_selection",
                SourcePayload.source_key == str(TEST_DRAFT_YEAR),
            )
        )
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Player).where(Player.nhl_id == TEST_PLAYER_NHL_ID))
        session.execute(delete(Team).where(Team.nhl_id == TEST_TEAM_NHL_ID))
