"""Operational data-health evaluation tests."""

import os
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import delete

import sportsball.validation.data_health as health
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, IngestionRun, Season, Team
from sportsball.validation.data_health import (
    HealthStatus,
    check_data_health,
    format_data_health,
)

TEST_NOW = datetime(2099, 2, 10, 15, tzinfo=UTC)
TEST_SEASON_ID = 20982099
TEST_GAME_ID = 2098020999
TEST_TEAM_IDS = (991, 992)
TEST_JOBS = (
    "daily_update",
    "ingest_schedule_date",
    "ingest_standings",
    *health.MONEYPUCK_JOBS,
)

database_test = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_freshness_thresholds_distinguish_warning_and_error() -> None:
    warning = health._classify_freshness(
        "test",
        TEST_NOW - timedelta(hours=40),
        TEST_NOW,
        timedelta(hours=36),
        timedelta(hours=48),
    )
    error = health._classify_freshness(
        "test",
        TEST_NOW - timedelta(hours=49),
        TEST_NOW,
        timedelta(hours=36),
        timedelta(hours=48),
    )

    assert warning.status is HealthStatus.WARNING
    assert error.status is HealthStatus.ERROR


def test_data_health_requires_positive_recent_window() -> None:
    with pytest.raises(ValueError, match="recent_days must be at least 1"):
        check_data_health(checked_at=TEST_NOW, recent_days=0)


def test_data_health_requires_timezone_aware_timestamp() -> None:
    with pytest.raises(ValueError, match="checked_at must be timezone-aware"):
        check_data_health(checked_at=datetime(2099, 2, 10), recent_days=3)


@database_test
def test_healthy_recent_runs_pass_during_offseason(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_stuck_run_check(monkeypatch)
    _create_successful_runs()
    try:
        report = check_data_health(checked_at=TEST_NOW)

        assert report.status is HealthStatus.HEALTHY
        assert report.errors == 0
        assert report.warnings == 0
        assert _check(report, "recent_boxscores").message == "no final games in the last 3 days"
        assert format_data_health(report)[-1] == ("summary status=healthy errors=0 warnings=0")
    finally:
        _clean_up()


@database_test
def test_missing_recent_game_facts_fail_health(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_stuck_run_check(monkeypatch)
    _create_successful_runs()
    _create_final_game()
    try:
        report = check_data_health(checked_at=TEST_NOW)

        assert report.status is HealthStatus.ERROR
        assert _check(report, "recent_boxscores").status is HealthStatus.ERROR
        assert _check(report, "recent_play_by_play").status is HealthStatus.ERROR
        assert _check(report, "recent_boxscores").message == "0/1 complete; 1 missing"
    finally:
        _clean_up()


@database_test
def test_latest_failed_daily_run_fails_health(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _isolate_stuck_run_check(monkeypatch)
    _create_successful_runs()
    with session_scope() as session:
        session.add(
            IngestionRun(
                job_name="daily_update",
                status="failed",
                parameters={"health_test": True},
                started_at=TEST_NOW - timedelta(minutes=10),
                finished_at=TEST_NOW - timedelta(minutes=5),
                error_message="controlled failure",
            )
        )
    try:
        report = check_data_health(checked_at=TEST_NOW)

        assert _check(report, "daily_ingestion").status is HealthStatus.ERROR
        assert _check(report, "daily_ingestion").message == "latest run status is failed"
    finally:
        _clean_up()


def _check(report: health.DataHealthReport, name: str) -> health.HealthCheck:
    return next(check for check in report.checks if check.name == name)


def _isolate_stuck_run_check(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_stuck_runs(_now: datetime) -> health.HealthCheck:
        return health.HealthCheck(
            "stuck_ingestion_runs",
            HealthStatus.HEALTHY,
            "no ingestion run has exceeded two hours",
        )

    monkeypatch.setattr(health, "_stuck_runs_check", no_stuck_runs)


def _create_successful_runs() -> None:
    with session_scope() as session:
        for index, job_name in enumerate(TEST_JOBS):
            finished_at = TEST_NOW - timedelta(minutes=30 + index)
            session.add(
                IngestionRun(
                    job_name=job_name,
                    status="succeeded",
                    parameters={"health_test": True},
                    started_at=finished_at - timedelta(minutes=5),
                    finished_at=finished_at,
                    records_processed=1,
                )
            )


def _create_final_game() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2098, end_year=2099))
        away = Team(nhl_id=TEST_TEAM_IDS[0], abbreviation="HAA", name="Health Away")
        home = Team(nhl_id=TEST_TEAM_IDS[1], abbreviation="HAH", name="Health Home")
        session.add_all((away, home))
        session.flush()
        session.add(
            Game(
                nhl_id=TEST_GAME_ID,
                season_id=TEST_SEASON_ID,
                game_type=2,
                game_date=date(2099, 2, 10),
                start_time_utc=TEST_NOW,
                state="FINAL",
                away_team_id=away.id,
                home_team_id=home.id,
            )
        )


def _clean_up() -> None:
    with session_scope() as session:
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
        session.execute(
            delete(IngestionRun).where(
                IngestionRun.parameters["health_test"].as_boolean().is_(True)
            )
        )
