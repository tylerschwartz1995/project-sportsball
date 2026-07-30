"""Database-backed tests for interrupted ingestion reconciliation."""

import os
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete

from sportsball.operations.ingestion_recovery import reconcile_abandoned_runs
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun

TEST_NOW = datetime(2099, 3, 1, 12, tzinfo=UTC)

database_test = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_reconciliation_requires_positive_threshold() -> None:
    with pytest.raises(ValueError, match="older_than must be positive"):
        reconcile_abandoned_runs(checked_at=TEST_NOW, older_than=timedelta())


def test_reconciliation_requires_timezone_aware_timestamp() -> None:
    with pytest.raises(ValueError, match="checked_at must be timezone-aware"):
        reconcile_abandoned_runs(checked_at=datetime(2099, 3, 1))


@database_test
def test_reconciliation_only_fails_old_runs_with_later_matching_success() -> None:
    superseded_id, unresolved_id, recent_id = _create_runs()
    scoped_ids = (superseded_id, unresolved_id, recent_id)
    try:
        preview = reconcile_abandoned_runs(
            checked_at=TEST_NOW,
            older_than=timedelta(hours=2),
            run_ids=scoped_ids,
        )

        assert len(preview.runs) == 2
        assert preview.superseded == 1
        assert preview.unresolved == 1
        assert preview.reconciled == 0
        assert _status(superseded_id) == "running"

        applied = reconcile_abandoned_runs(
            checked_at=TEST_NOW,
            older_than=timedelta(hours=2),
            apply=True,
            run_ids=scoped_ids,
        )

        assert applied.reconciled == 1
        assert _status(superseded_id) == "failed"
        assert _status(unresolved_id) == "running"
        assert _status(recent_id) == "running"
        with session_scope() as session:
            reconciled = session.get(IngestionRun, superseded_id)
            assert reconciled is not None
            assert reconciled.finished_at == TEST_NOW
            assert "superseded by successful run" in (reconciled.error_message or "")
    finally:
        _clean_up(scoped_ids)


def _create_runs() -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    superseded_id = uuid.uuid4()
    unresolved_id = uuid.uuid4()
    recent_id = uuid.uuid4()
    parameters = {"game_id": 2099020001, "recovery_test": True}
    with session_scope() as session:
        session.add_all(
            (
                IngestionRun(
                    id=superseded_id,
                    job_name="recovery_test_job",
                    status="running",
                    parameters=parameters,
                    started_at=TEST_NOW - timedelta(hours=4),
                ),
                IngestionRun(
                    job_name="recovery_test_job",
                    status="succeeded",
                    parameters=parameters,
                    started_at=TEST_NOW - timedelta(hours=3),
                    finished_at=TEST_NOW - timedelta(hours=3),
                ),
                IngestionRun(
                    id=unresolved_id,
                    job_name="unresolved_recovery_test_job",
                    status="running",
                    parameters={"recovery_test": True},
                    started_at=TEST_NOW - timedelta(hours=4),
                ),
                IngestionRun(
                    id=recent_id,
                    job_name="recent_recovery_test_job",
                    status="running",
                    parameters={"recovery_test": True},
                    started_at=TEST_NOW - timedelta(minutes=30),
                ),
            )
        )
    return superseded_id, unresolved_id, recent_id


def _status(run_id: uuid.UUID) -> str:
    with session_scope() as session:
        run = session.get(IngestionRun, run_id)
        assert run is not None
        return run.status


def _clean_up(run_ids: tuple[uuid.UUID, ...]) -> None:
    with session_scope() as session:
        session.execute(
            delete(IngestionRun).where(
                (IngestionRun.id.in_(run_ids))
                | (IngestionRun.parameters["recovery_test"].as_boolean().is_(True))
            )
        )
