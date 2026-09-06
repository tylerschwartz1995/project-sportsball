"""The rebuild is idempotent and failures roll back output while retaining audit."""

import os
from datetime import UTC, date, datetime

import pytest
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

import sportsball.ingestion.orchestration.descriptive as job
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, IngestionRun, ScheduleGameContext, Season, Team


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="requires an isolated migrated PostgreSQL database",
)
def test_rebuild_replaces_output_atomically_and_records_failures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    season_id = 20972098
    with session_scope() as session:
        session.add(Season(id=season_id, start_year=2097, end_year=2098))
        home = Team(nhl_id=979, abbreviation="DXH", name="Derived Home")
        away = Team(nhl_id=978, abbreviation="DXA", name="Derived Away")
        session.add_all((home, away))
        session.flush()
        match = Game(
            nhl_id=2097020001,
            season_id=season_id,
            game_type=2,
            game_date=date(2097, 10, 1),
            start_time_utc=datetime(2097, 10, 1, tzinfo=UTC),
            home_team_id=home.id,
            away_team_id=away.id,
            state="FUT",
        )
        session.add(match)
        session.flush()
        game_id = match.id
        team_ids = [home.id, away.id]
        existing_runs = set(session.scalars(select(IngestionRun.id)))
    try:
        job.build_descriptive_analytics()
        job.build_descriptive_analytics()
        with session_scope() as session:
            rows = session.scalars(
                select(ScheduleGameContext).where(ScheduleGameContext.game_id == game_id)
            ).all()
            assert len(rows) == 2
            assert all(row.opponent_prior_games == 0 for row in rows)
            successful_run = rows[0].ingestion_run_id

        def fail_after_mutation(session: Session, _run_id: object) -> int:
            session.execute(delete(ScheduleGameContext))
            raise ValueError("injected computation failure")

        monkeypatch.setattr(job, "refresh_schedule", fail_after_mutation)
        with pytest.raises(ValueError, match="injected computation failure"):
            job.build_descriptive_analytics()
        with session_scope() as session:
            rows = session.scalars(
                select(ScheduleGameContext).where(ScheduleGameContext.game_id == game_id)
            ).all()
            assert len(rows) == 2
            assert all(row.ingestion_run_id == successful_run for row in rows)
            failures = session.scalars(
                select(IngestionRun).where(
                    IngestionRun.id.not_in(existing_runs),
                    IngestionRun.status == "failed",
                )
            ).all()
            assert len(failures) == 1
            assert failures[0].finished_at is not None
            assert failures[0].error_message == "injected computation failure"
    finally:
        with session_scope() as session:
            session.execute(delete(Game).where(Game.id == game_id))
            session.execute(delete(Team).where(Team.id.in_(team_ids)))
            session.execute(delete(Season).where(Season.id == season_id))
            session.execute(delete(IngestionRun).where(IngestionRun.id.not_in(existing_runs)))
