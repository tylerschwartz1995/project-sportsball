"""Bounded schedule reconciliation that survives missed days and season rollover."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import DailyScheduleCheckpoint, DailyWork


def recovery_seasons(active_season: int, run_date: date) -> list[int]:
    """Never lose enrolled seasons when the next season enters the schedule."""
    with session_scope() as session:
        checkpoints = list(session.scalars(select(DailyScheduleCheckpoint)).all())
        enrolled = {
            c.season_id
            for c in checkpoints
            if c.next_date <= min(run_date, date(c.season_id % 10000, 8, 31))
            or c.covered_through is None
            or c.covered_through < min(run_date, date(c.season_id % 10000, 8, 31))
        }
        pending = set(
            session.scalars(
                select(DailyWork.season_id)
                .where(
                    DailyWork.status != "succeeded",
                )
                .distinct()
            ).all()
        )
    # Completed seasons stop routine imports; unfinished work remains explicit.
    return sorted({active_season} | pending | enrolled)


def discover_season(
    season_id: int,
    run_date: date,
    client: NhlClient,
    *,
    max_pages: int,
) -> tuple[int, bool]:
    """Commit a cursor after each weekly page; sweep future dates as well as gaps."""
    now = datetime.now(UTC)
    start = date(season_id // 10000, 9, 1)
    end = date(season_id % 10000, 8, 31)
    with session_scope() as session:
        checkpoint = session.get(DailyScheduleCheckpoint, season_id)
        if checkpoint is None:
            checkpoint = DailyScheduleCheckpoint(
                season_id=season_id, next_date=start, checked_at=now
            )
            session.add(checkpoint)
        elif (
            checkpoint.next_date > end
            and run_date <= end
            and (now - checkpoint.checked_at >= timedelta(days=7))
        ):
            checkpoint.next_date = start
        anchor = checkpoint.next_date
        covered_through = checkpoint.covered_through
    rows = 0
    # The future schedule cursor says nothing about results published since the
    # previous run. Revisit that whole gap, including the boundary game day.
    if covered_through is not None:
        gap_anchor = covered_through
        for _ in range(max_pages):
            if gap_anchor > min(run_date, end):
                break
            rows += ingest_schedule_date(gap_anchor, client).games_processed
            gap_anchor += timedelta(days=7)
            with session_scope() as session:
                checkpoint = session.get(DailyScheduleCheckpoint, season_id)
                assert checkpoint is not None
                checkpoint.covered_through = min(gap_anchor - timedelta(days=1), run_date, end)
        if gap_anchor <= min(run_date, end):
            return rows, False
    for _ in range(max_pages):
        if anchor > end:
            break
        rows += ingest_schedule_date(anchor, client).games_processed
        anchor += timedelta(days=7)
        with session_scope() as session:
            checkpoint = session.get(DailyScheduleCheckpoint, season_id)
            assert checkpoint is not None
            checkpoint.next_date = anchor
            checkpoint.checked_at = now
            checkpoint.covered_through = max(
                checkpoint.covered_through or start - timedelta(days=1),
                min(anchor - timedelta(days=1), run_date, end),
            )
    # A first sweep/recovery must reach the present before we claim completeness.
    return rows, anchor > min(run_date, end)
