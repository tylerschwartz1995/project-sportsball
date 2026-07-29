"""PostgreSQL integration tests for player profile ingestion and resume."""

import os
from typing import Any

import httpx
import pytest
from sqlalchemy import delete, func, select
from test_nhl_player_profile import _profile_payload

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.player_profile_backfill import (
    backfill_player_profiles,
)
from sportsball.ingestion.orchestration.player_profiles import ingest_player_profile
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    IngestionRun,
    Player,
    PlayerProfileBackfillPlayer,
    SourcePayload,
    Team,
)

TEST_PLAYER_ID = 950001
TEST_TEAM_ID = 750

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_player_profile_ingestion_is_idempotent() -> None:
    _create_dimensions()
    run_ids = []
    try:
        first = ingest_player_profile(TEST_PLAYER_ID, _client())
        second = ingest_player_profile(TEST_PLAYER_ID, _client())
        run_ids.extend([first.run_id, second.run_id])
        with session_scope() as session:
            player = session.scalar(select(Player).where(Player.nhl_id == TEST_PLAYER_ID))
            assert player is not None
            assert player.display_name == "Test Skater"
            assert player.birth_country == "CAN"
            assert player.current_team_id is not None
            assert player.draft_overall_pick == 15
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourcePayload)
                    .where(
                        SourcePayload.resource_type == "player_profile",
                        SourcePayload.source_key == str(TEST_PLAYER_ID),
                    )
                )
                == 1
            )
    finally:
        _clean_up(run_ids)


def test_player_profile_backfill_parks_and_retries_failure() -> None:
    _create_dimensions()
    try:
        failed = backfill_player_profiles(
            _client(fail=True),
            player_ids=[TEST_PLAYER_ID],
        )
        assert failed.failed_players == 1
        assert failed.attempted_this_run == 1

        skipped = backfill_player_profiles(
            _client(),
            player_ids=[TEST_PLAYER_ID],
        )
        assert skipped.attempted_this_run == 0

        retried = backfill_player_profiles(
            _client(),
            retry_failed=True,
            player_ids=[TEST_PLAYER_ID],
        )
        assert retried.completed_players == 1
        assert retried.failed_players == 0
        with session_scope() as session:
            player_pk = session.scalar(select(Player.id).where(Player.nhl_id == TEST_PLAYER_ID))
            status = session.get(PlayerProfileBackfillPlayer, player_pk)
            assert status is not None
            assert status.status == "completed"
            assert status.attempt_count == 2
    finally:
        _clean_up([])


def _client(*, fail: bool = False) -> NhlClient:
    return NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(
                lambda _request: (
                    httpx.Response(404) if fail else httpx.Response(200, json=_profile_payload())
                )
            ),
        ),
        request_interval_seconds=0,
        max_retries=0,
    )


def _create_dimensions() -> None:
    with session_scope() as session:
        team = Team(nhl_id=TEST_TEAM_ID, abbreviation="TST", name="Test Team")
        player = Player(
            nhl_id=TEST_PLAYER_ID,
            display_name="Initial Name",
            position="C",
        )
        session.add_all([team, player])


def _clean_up(run_ids: list[Any]) -> None:
    with session_scope() as session:
        player_pk = session.scalar(select(Player.id).where(Player.nhl_id == TEST_PLAYER_ID))
        recorded_run_ids = session.scalars(
            select(IngestionRun.id).where(
                IngestionRun.parameters["player_id"].as_string() == str(TEST_PLAYER_ID)
            )
        ).all()
        if player_pk is not None:
            session.execute(
                delete(PlayerProfileBackfillPlayer).where(
                    PlayerProfileBackfillPlayer.player_id == player_pk
                )
            )
        session.execute(
            delete(SourcePayload).where(
                SourcePayload.resource_type == "player_profile",
                SourcePayload.source_key == str(TEST_PLAYER_ID),
            )
        )
        all_run_ids = {*run_ids, *recorded_run_ids}
        if all_run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(all_run_ids)))
        session.execute(delete(Player).where(Player.nhl_id == TEST_PLAYER_ID))
        session.execute(delete(Team).where(Team.nhl_id == TEST_TEAM_ID))
