"""Failure and recovery rehearsals against an isolated migrated PostgreSQL database."""

import os
import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from typing import cast

import pytest
from sqlalchemy import delete, select

import sportsball.ingestion.orchestration.daily_discovery as discovery
import sportsball.ingestion.orchestration.daily_update as daily
from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.schedules import ScheduleIngestionResult
from sportsball.operations.daily_state import (
    begin_work,
    coordinating_run,
    daily_lock,
    finish_work,
    park_nonfinal_games,
    pending_work,
    queue_games,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    DailyScheduleCheckpoint,
    DailyWork,
    Game,
    IngestionRun,
    Season,
    Team,
)
from sportsball.validation.daily_coverage import moneypuck_coverage
from sportsball.validation.data_health import HealthStatus, _daily_work_checks

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="requires an isolated PostgreSQL test database",
)
SEASON = 20962097
GAME = 2096020001
RUN_DATE = date(2097, 1, 15)


@pytest.fixture
def enrolled() -> Iterator[None]:
    with session_scope() as session:
        session.add(Season(id=SEASON, start_year=2096, end_year=2097))
        away = Team(nhl_id=961, abbreviation="RAA", name="Recovery Away")
        home = Team(nhl_id=962, abbreviation="RHH", name="Recovery Home")
        session.add_all((away, home))
        session.flush()
        session.add(
            Game(
                nhl_id=GAME,
                season_id=SEASON,
                game_type=2,
                game_date=RUN_DATE - timedelta(days=10),
                start_time_utc=datetime(2097, 1, 5, tzinfo=UTC),
                state="OFF",
                away_team_id=away.id,
                home_team_id=home.id,
            )
        )
    try:
        yield
    finally:
        with session_scope() as session:
            session.execute(delete(DailyWork).where(DailyWork.season_id == SEASON))
            session.execute(
                delete(DailyScheduleCheckpoint).where(DailyScheduleCheckpoint.season_id == SEASON)
            )
            session.execute(delete(Game).where(Game.season_id == SEASON))
            session.execute(delete(Team).where(Team.nhl_id.in_((961, 962))))
            session.execute(delete(Season).where(Season.id == SEASON))
            session.execute(
                delete(IngestionRun).where(
                    IngestionRun.parameters["recovery_test"].as_boolean().is_(True)
                )
            )


def test_outage_revisits_gap_even_with_complete_future_schedule(
    enrolled: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    with session_scope() as session:
        session.add(
            DailyScheduleCheckpoint(
                season_id=SEASON,
                next_date=date(2097, 9, 1),
                covered_through=date(2097, 1, 1),
                checked_at=datetime.now(UTC),
            )
        )
    anchors: list[date] = []

    def fetch(anchor: date, client: NhlClient) -> ScheduleIngestionResult:
        anchors.append(anchor)
        return ScheduleIngestionResult(uuid.uuid4(), anchor, 2, None)

    monkeypatch.setattr(discovery, "ingest_schedule_date", fetch)
    rows, ready = discovery.discover_season(
        SEASON, RUN_DATE, cast(NhlClient, object()), max_pages=64
    )
    assert ready and rows == 6
    assert anchors == [date(2097, 1, 1), date(2097, 1, 8), date(2097, 1, 15)]
    with session_scope() as session:
        checkpoint = session.get(DailyScheduleCheckpoint, SEASON)
        assert checkpoint is not None and checkpoint.covered_through == RUN_DATE


def test_discovery_resumes_after_last_committed_page(
    enrolled: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[date] = []

    def failing_fetch(anchor: date, client: NhlClient) -> ScheduleIngestionResult:
        seen.append(anchor)
        if len(seen) == 2:
            raise RuntimeError("source unavailable")
        return ScheduleIngestionResult(uuid.uuid4(), anchor, 1, None)

    monkeypatch.setattr(discovery, "ingest_schedule_date", failing_fetch)
    with pytest.raises(RuntimeError, match="source unavailable"):
        discovery.discover_season(SEASON, RUN_DATE, cast(NhlClient, object()), max_pages=2)
    with session_scope() as session:
        checkpoint = session.get(DailyScheduleCheckpoint, SEASON)
        assert checkpoint is not None and checkpoint.next_date == date(2096, 9, 8)
    fetched: list[date] = []

    def recovery_fetch(anchor: date, client: NhlClient) -> ScheduleIngestionResult:
        fetched.append(anchor)
        return ScheduleIngestionResult(uuid.uuid4(), anchor, 1, None)

    monkeypatch.setattr(discovery, "ingest_schedule_date", recovery_fetch)
    _, ready = discovery.discover_season(SEASON, RUN_DATE, cast(NhlClient, object()), max_pages=64)
    assert ready
    assert date(2096, 9, 1) not in fetched
    assert date(2096, 9, 8) in fetched


def test_missing_and_failed_games_survive_correction_window(
    enrolled: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    options = daily.DailyUpdateOptions(run_date=RUN_DATE)
    assert daily._recent_final_game_ids(options, SEASON) == [GAME]
    # Even complete facts need retry if a later correction import failed.
    monkeypatch.setattr(daily, "missing_game_ids", lambda *args: set())
    assert begin_work("boxscore", str(GAME), SEASON)
    finish_work("boxscore", str(GAME), error="correction failed")
    assert daily._recent_final_game_ids(options, SEASON) == [GAME]
    assert not begin_work("boxscore", str(GAME), SEASON)
    with session_scope() as session:
        work = session.get(DailyWork, ("boxscore", str(GAME)))
        assert work is not None
        work.next_attempt_at = datetime.now(UTC) - timedelta(seconds=1)
    assert begin_work("boxscore", str(GAME), SEASON)
    finish_work("boxscore", str(GAME))
    assert daily._recent_final_game_ids(options, SEASON) == []


def test_queued_corrections_remain_after_date_window_and_across_rollover(
    enrolled: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(daily, "missing_game_ids", lambda *args: set())
    queue_games([GAME], SEASON)
    assert pending_work("boxscore", SEASON) == [str(GAME)]
    assert daily._recent_final_game_ids(daily.DailyUpdateOptions(run_date=RUN_DATE), SEASON) == [
        GAME
    ]
    assert SEASON in discovery.recovery_seasons(SEASON + 10001, date(2097, 10, 1))


def test_lock_rejects_overlapping_runs_and_recovers_interrupted_audits(enrolled: None) -> None:
    with session_scope() as session:
        parent = IngestionRun(
            job_name="daily_update",
            status="running",
            parameters={"recovery_test": True, "coordination_version": 1},
        )
        session.add(parent)
        session.flush()
        parent_id = parent.id
    with coordinating_run(parent_id), session_scope() as session:
        child = IngestionRun(
            job_name="ingest_boxscore", status="running", parameters={"recovery_test": True}
        )
        session.add(child)
        session.flush()
        assert child.parent_run_id == parent_id
    with daily_lock():
        with pytest.raises(RuntimeError, match="another daily ingestion"), daily_lock():
            pytest.fail("second coordinator acquired the lock")
        with session_scope() as session:
            runs = list(
                session.scalars(
                    select(IngestionRun).where(
                        IngestionRun.parameters["recovery_test"].as_boolean().is_(True)
                    )
                ).all()
            )
            assert len(runs) == 2 and all(r.status == "failed" for r in runs)
    with daily_lock():
        pass


def test_advanced_coverage_respects_playoff_boundaries_and_ages_missing_content(
    enrolled: None,
) -> None:
    with session_scope() as session:
        game = session.scalar(select(Game).where(Game.nhl_id == GAME))
        assert game is not None
        game.game_type = 3
    coverage = moneypuck_coverage(SEASON, RUN_DATE)
    # Playoffs support team games and shots, not player-game/line archives.
    assert coverage["expected"] == 2
    assert coverage["missing"] == 2
    assert "lines_3_missing" not in coverage
    assert begin_work("moneypuck_coverage", str(SEASON), SEASON)
    finish_work("moneypuck_coverage", str(SEASON), coverage=coverage, waiting=True)
    checks = _daily_work_checks(datetime(2097, 1, 15, tzinfo=UTC))
    assert (
        next(c for c in checks if c.name.startswith("advanced_coverage")).status
        is HealthStatus.ERROR
    )


def test_failed_task_preserves_last_publication_timestamp(enrolled: None) -> None:
    assert begin_work("boxscore", str(GAME), SEASON)
    finish_work("boxscore", str(GAME))
    with session_scope() as session:
        original = session.get(DailyWork, ("boxscore", str(GAME)))
        assert original is not None
        published = original.published_at
    assert begin_work("boxscore", str(GAME), SEASON)
    finish_work("boxscore", str(GAME), error="malformed revised response")
    with session_scope() as session:
        failed = session.get(DailyWork, ("boxscore", str(GAME)))
        assert failed is not None and failed.published_at == published
        assert failed.attempts == 2


def test_rollover_recovers_old_result_gap_even_when_future_sweep_completed(enrolled: None) -> None:
    with session_scope() as session:
        session.add(
            DailyScheduleCheckpoint(
                season_id=SEASON,
                next_date=date(2097, 9, 1),
                covered_through=date(2097, 6, 1),
                checked_at=datetime.now(UTC),
            )
        )
    assert SEASON in discovery.recovery_seasons(SEASON + 10001, date(2097, 10, 1))


def test_postponed_work_is_not_a_health_failure_and_returns_after_play(enrolled: None) -> None:
    queue_games([GAME], SEASON)
    with session_scope() as session:
        game = session.scalar(select(Game).where(Game.nhl_id == GAME))
        assert game is not None
        game.state = "FUT"
    park_nonfinal_games(SEASON, RUN_DATE)
    checks = _daily_work_checks(datetime(2097, 1, 15, tzinfo=UTC))
    assert checks[0].status is HealthStatus.HEALTHY
    assert daily._recent_final_game_ids(daily.DailyUpdateOptions(run_date=RUN_DATE), SEASON) == []
    with session_scope() as session:
        game = session.scalar(select(Game).where(Game.nhl_id == GAME))
        assert game is not None
        game.state = "OFF"
    assert daily._recent_final_game_ids(daily.DailyUpdateOptions(run_date=RUN_DATE), SEASON) == [
        GAME
    ]
