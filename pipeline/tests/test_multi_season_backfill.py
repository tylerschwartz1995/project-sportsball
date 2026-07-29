"""Tests for multi-season schedule coordination and reconciliation."""

import os
from datetime import date

import httpx
import pytest
from sqlalchemy import delete

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.multi_season_backfill import (
    SeasonBackfillSummary,
    backfill_season_range,
    season_ids_in_range,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import ScheduleBackfillCheckpoint

TEST_SEASONS = [20972098, 20982099]

requires_database = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_season_ids_in_range_are_consecutive() -> None:
    assert season_ids_in_range(20052006, 20072008) == [
        20052006,
        20062007,
        20072008,
    ]


@pytest.mark.parametrize(
    ("start_season", "end_season"),
    [(20052005, 20062007), (20062007, 20052006)],
)
def test_season_ids_in_range_reject_invalid_ranges(
    start_season: int,
    end_season: int,
) -> None:
    with pytest.raises(ValueError):
        season_ids_in_range(start_season, end_season)


@requires_database
def test_completed_seasons_are_skipped_and_reconciled() -> None:
    with session_scope() as session:
        session.add_all(
            [
                ScheduleBackfillCheckpoint(
                    season_id=season_id,
                    next_date=None,
                    end_date=date(2100, 6, 1),
                    status="completed",
                    requests_completed=1,
                    games_processed=0,
                )
                for season_id in TEST_SEASONS
            ]
        )

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(lambda _request: raise_unexpected_request()),
        )
    )

    reported_seasons: list[SeasonBackfillSummary] = []
    try:
        result = backfill_season_range(
            TEST_SEASONS[0],
            TEST_SEASONS[1],
            client,
            on_season_complete=reported_seasons.append,
        )

        assert result.skipped == 2
        assert result.completed == 0
        assert result.failed == 0
        assert all(season.status == "skipped" for season in result.seasons)
        assert reported_seasons == list(result.seasons)
    finally:
        with session_scope() as session:
            session.execute(
                delete(ScheduleBackfillCheckpoint).where(
                    ScheduleBackfillCheckpoint.season_id.in_(TEST_SEASONS)
                )
            )


def raise_unexpected_request() -> httpx.Response:
    """Fail if a completed season triggers a provider request."""
    raise AssertionError("completed seasons must not call the NHL client")
