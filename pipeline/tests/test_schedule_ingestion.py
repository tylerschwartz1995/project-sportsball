"""PostgreSQL integration test for idempotent schedule ingestion."""

import os
from datetime import date
from pathlib import Path

import httpx
import pytest
from sqlalchemy import delete, func, select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, IngestionRun, Season, SourcePayload, Team

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "nhl_schedule.json"

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_schedule_ingestion_is_idempotent() -> None:
    fixture = FIXTURE_PATH.read_bytes()

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=fixture)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        )
    )
    run_ids = []

    try:
        first = ingest_schedule_date(date(2026, 1, 2), client)
        second = ingest_schedule_date(date(2026, 1, 2), client)
        run_ids.extend([first.run_id, second.run_id])

        with session_scope() as session:
            assert (
                session.scalar(
                    select(func.count()).select_from(Game).where(Game.nhl_id == 2025020600)
                )
                == 1
            )
            assert (
                session.scalar(
                    select(func.count()).select_from(Team).where(Team.nhl_id.in_([6, 10]))
                )
                == 2
            )
            assert (
                session.scalar(
                    select(func.count()).select_from(Season).where(Season.id == 20252026)
                )
                == 1
            )
            assert (
                session.scalar(
                    select(func.count())
                    .select_from(SourcePayload)
                    .where(
                        SourcePayload.provider == "nhl",
                        SourcePayload.resource_type == "schedule",
                        SourcePayload.source_key == "2026-01-02",
                    )
                )
                == 1
            )
            runs = session.scalars(select(IngestionRun).where(IngestionRun.id.in_(run_ids))).all()
            assert len(runs) == 2
            assert all(run.status == "succeeded" for run in runs)
            assert all(run.records_processed == 1 for run in runs)
    finally:
        with session_scope() as session:
            session.execute(delete(SourcePayload).where(SourcePayload.source_key == "2026-01-02"))
            if run_ids:
                session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
            session.execute(delete(Game).where(Game.nhl_id == 2025020600))
            session.execute(delete(Season).where(Season.id == 20252026))
