"""Audited materialization of descriptive data; no upstream fetches or modelling."""

from datetime import UTC, datetime

from sqlalchemy import update

from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun
from sportsball.persistence.repositories.descriptive import refresh_history, refresh_schedule


def build_descriptive_analytics(*, history: bool = True, schedule: bool = True) -> int:
    """Atomically publish derived data, retaining old output if a build fails."""
    if not history and not schedule:
        raise ValueError("select at least one descriptive dataset")
    with session_scope() as session:
        run = IngestionRun(
            job_name="build_descriptive_analytics",
            status="running",
            parameters={"history": history, "schedule": schedule},
        )
        session.add(run)
        session.flush()
        run_id = run.id
    try:
        with session_scope() as session:
            count = refresh_history(session, run_id) if history else 0
            count += refresh_schedule(session, run_id) if schedule else 0
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=count,
                    finished_at=datetime.now(UTC),
                )
            )
        return count
    except Exception as error:
        with session_scope() as session:
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="failed",
                    error_message=str(error),
                    finished_at=datetime.now(UTC),
                )
            )
        raise
