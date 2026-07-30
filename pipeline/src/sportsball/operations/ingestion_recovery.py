"""Safe reconciliation of interrupted ingestion audit records."""

import uuid
from collections.abc import Collection
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun


@dataclass(frozen=True)
class AbandonedRun:
    """One old running audit record and an optional later successful retry."""

    run_id: uuid.UUID
    job_name: str
    started_at: datetime
    parameters: dict[str, object]
    superseding_run_id: uuid.UUID | None


@dataclass(frozen=True)
class AbandonedRunReconciliation:
    """Dry-run or applied result for abandoned ingestion records."""

    checked_at: datetime
    older_than: timedelta
    runs: tuple[AbandonedRun, ...]
    applied: bool
    reconciled: int

    @property
    def unresolved(self) -> int:
        return sum(run.superseding_run_id is None for run in self.runs)

    @property
    def superseded(self) -> int:
        return len(self.runs) - self.unresolved


def reconcile_abandoned_runs(
    *,
    checked_at: datetime | None = None,
    older_than: timedelta = timedelta(hours=2),
    apply: bool = False,
    run_ids: Collection[uuid.UUID] | None = None,
) -> AbandonedRunReconciliation:
    """Mark only old running records proven superseded by matching successes."""
    if older_than <= timedelta():
        raise ValueError("older_than must be positive")
    now = checked_at or datetime.now(UTC)
    if now.tzinfo is None:
        raise ValueError("checked_at must be timezone-aware")
    now = now.astimezone(UTC)
    runs = _find_abandoned_runs(now - older_than, run_ids)
    superseded = [run for run in runs if run.superseding_run_id is not None]

    if apply and superseded:
        with session_scope() as session:
            for run in superseded:
                session.execute(
                    update(IngestionRun)
                    .where(
                        IngestionRun.id == run.run_id,
                        IngestionRun.status == "running",
                    )
                    .values(
                        status="failed",
                        error_message=(
                            "reconciled as abandoned after interruption; "
                            f"superseded by successful run {run.superseding_run_id}"
                        ),
                        finished_at=now,
                    )
                )

    return AbandonedRunReconciliation(
        checked_at=now,
        older_than=older_than,
        runs=tuple(runs),
        applied=apply,
        reconciled=len(superseded) if apply else 0,
    )


def _find_abandoned_runs(
    cutoff: datetime,
    run_ids: Collection[uuid.UUID] | None,
) -> list[AbandonedRun]:
    statement = (
        select(IngestionRun)
        .where(
            IngestionRun.status == "running",
            IngestionRun.started_at < cutoff,
        )
        .order_by(IngestionRun.started_at, IngestionRun.id)
    )
    if run_ids is not None:
        statement = statement.where(IngestionRun.id.in_(run_ids))
    with session_scope() as session:
        interrupted = list(session.scalars(statement).all())

    return [
        AbandonedRun(
            run_id=run.id,
            job_name=run.job_name,
            started_at=run.started_at,
            parameters=dict(run.parameters),
            superseding_run_id=_later_successful_run_id(run),
        )
        for run in interrupted
    ]


def _later_successful_run_id(run: IngestionRun) -> uuid.UUID | None:
    with session_scope() as session:
        return session.scalar(
            select(IngestionRun.id)
            .where(
                IngestionRun.job_name == run.job_name,
                IngestionRun.parameters == run.parameters,
                IngestionRun.status == "succeeded",
                IngestionRun.started_at > run.started_at,
            )
            .order_by(IngestionRun.started_at.desc())
            .limit(1)
        )
