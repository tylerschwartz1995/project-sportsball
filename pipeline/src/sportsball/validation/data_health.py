"""Operational freshness and recent-game completeness checks."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from enum import StrEnum

from sqlalchemy import func, select

from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    DailyWork,
    Game,
    GameEvent,
    IngestionRun,
    TeamGameStats,
)

CORE_HEALTHY_AGE = timedelta(hours=36)
CORE_ERROR_AGE = timedelta(hours=48)
MONEYPUCK_HEALTHY_AGE = timedelta(hours=48)
MONEYPUCK_ERROR_AGE = timedelta(hours=96)
STUCK_RUN_AGE = timedelta(hours=2)
FINAL_GAME_STATES = ("FINAL", "OFF")
NHL_SEASON_GAME_TYPES = (2, 3)
MONEYPUCK_JOBS = (
    "ingest_moneypuck_season",
    "ingest_moneypuck_team_games",
    "ingest_moneypuck_player_games",
    "ingest_moneypuck_shots",
    "ingest_moneypuck_lines",
)


class HealthStatus(StrEnum):
    """Severity of one operational health check."""

    HEALTHY = "healthy"
    WARNING = "warning"
    ERROR = "error"


@dataclass(frozen=True)
class HealthCheck:
    """One human-readable health observation."""

    name: str
    status: HealthStatus
    message: str
    observed_at: datetime | None = None


@dataclass(frozen=True)
class DataHealthReport:
    """Operational health report evaluated at one point in time."""

    checked_at: datetime
    checks: tuple[HealthCheck, ...]

    @property
    def errors(self) -> int:
        return sum(check.status is HealthStatus.ERROR for check in self.checks)

    @property
    def warnings(self) -> int:
        return sum(check.status is HealthStatus.WARNING for check in self.checks)

    @property
    def status(self) -> HealthStatus:
        if self.errors:
            return HealthStatus.ERROR
        if self.warnings:
            return HealthStatus.WARNING
        return HealthStatus.HEALTHY


def check_data_health(
    *,
    checked_at: datetime | None = None,
    recent_days: int = 3,
) -> DataHealthReport:
    """Evaluate daily-run freshness, source freshness, and recent final games."""
    if recent_days < 1:
        raise ValueError("recent_days must be at least 1")
    now = checked_at or datetime.now(UTC)
    if now.tzinfo is None:
        raise ValueError("checked_at must be timezone-aware")
    now = now.astimezone(UTC)

    checks = [
        _daily_run_check(now),
        _stuck_runs_check(now),
        _source_freshness_check(
            "nhl_schedules",
            ("ingest_schedule_date",),
            now,
            CORE_HEALTHY_AGE,
            CORE_ERROR_AGE,
        ),
        _source_freshness_check(
            "official_standings",
            ("ingest_standings",),
            now,
            CORE_HEALTHY_AGE,
            CORE_ERROR_AGE,
        ),
        *_recent_game_checks(now, recent_days),
        _moneypuck_freshness_check(now),
        *_daily_work_checks(now),
    ]
    return DataHealthReport(checked_at=now, checks=tuple(checks))


def format_data_health(report: DataHealthReport) -> tuple[str, ...]:
    """Format a report for command-line operations and logs."""
    lines = [f"{check.name:<24} {check.status.value:<7} {check.message}" for check in report.checks]
    lines.append(
        f"summary status={report.status.value} errors={report.errors} warnings={report.warnings}"
    )
    return tuple(lines)


def _daily_run_check(now: datetime) -> HealthCheck:
    latest = _latest_run(("daily_update",), successful_only=False)
    if latest is None:
        return HealthCheck(
            "daily_ingestion",
            HealthStatus.ERROR,
            "no audited daily update has completed",
        )
    run_date = latest.parameters.get("run_date")
    if isinstance(run_date, str) and (now.date() - date.fromisoformat(run_date)).days > 2:
        return HealthCheck(
            "daily_ingestion",
            HealthStatus.ERROR,
            "latest daily run targets an old game date; current refresh is overdue",
        )
    if latest.status == "running":
        age = now - _as_utc(latest.started_at)
        status = HealthStatus.ERROR if age > STUCK_RUN_AGE else HealthStatus.WARNING
        return HealthCheck(
            "daily_ingestion",
            status,
            f"latest run is still running ({_format_age(age)})",
            latest.started_at,
        )
    if latest.status not in ("succeeded", "degraded"):
        return HealthCheck(
            "daily_ingestion",
            HealthStatus.ERROR,
            f"latest run status is {latest.status}",
            latest.finished_at or latest.started_at,
        )
    if latest.finished_at is None:
        return HealthCheck(
            "daily_ingestion",
            HealthStatus.ERROR,
            "latest successful run has no completion timestamp",
            latest.started_at,
        )
    freshness = _classify_freshness(
        "daily_ingestion",
        _as_utc(latest.finished_at),
        now,
        CORE_HEALTHY_AGE,
        CORE_ERROR_AGE,
    )
    if latest.status == "degraded" and freshness.status is not HealthStatus.ERROR:
        return HealthCheck(
            "daily_ingestion",
            HealthStatus.WARNING,
            "core NHL update completed; advanced data is delayed or failed",
            latest.finished_at,
        )
    return freshness


def _daily_work_checks(now: datetime) -> list[HealthCheck]:
    """Do not let a fresh download hide missing content or old retry work."""
    with session_scope() as session:
        unresolved = list(
            session.scalars(
                select(DailyWork).where(
                    DailyWork.status != "succeeded",
                )
            ).all()
        )
    core = [
        w
        for w in unresolved
        if not w.dataset.startswith("moneypuck") and w.status != "waiting_for_game"
    ]
    checks = [
        HealthCheck(
            "unfinished_core_work",
            HealthStatus.ERROR if core else HealthStatus.HEALTHY,
            f"{len(core)} unfinished core tasks",
        )
    ]
    for work in unresolved:
        if work.dataset != "moneypuck_coverage":
            continue
        oldest = work.coverage.get("oldest_missing_date")
        overdue = isinstance(oldest, str) and (now.date() - date.fromisoformat(oldest)).days > 4
        checks.append(
            HealthCheck(
                f"advanced_coverage:{work.season_id}",
                HealthStatus.ERROR if overdue else HealthStatus.WARNING,
                f"{work.coverage.get('missing', 0)} supported game/dataset pairs pending; "
                f"oldest game date {oldest}",
                work.checked_at,
            )
        )
    return checks


def _stuck_runs_check(now: datetime) -> HealthCheck:
    cutoff = now - STUCK_RUN_AGE
    with session_scope() as session:
        stuck = list(
            session.scalars(
                select(IngestionRun)
                .where(
                    IngestionRun.status == "running",
                    IngestionRun.started_at < cutoff,
                )
                .order_by(IngestionRun.started_at)
            ).all()
        )
    if not stuck:
        return HealthCheck(
            "stuck_ingestion_runs",
            HealthStatus.HEALTHY,
            "no ingestion run has exceeded two hours",
        )
    names = ", ".join(run.job_name for run in stuck[:3])
    suffix = "" if len(stuck) <= 3 else f" and {len(stuck) - 3} more"
    return HealthCheck(
        "stuck_ingestion_runs",
        HealthStatus.ERROR,
        f"{len(stuck)} stuck run(s): {names}{suffix}",
        min(run.started_at for run in stuck),
    )


def _source_freshness_check(
    name: str,
    job_names: tuple[str, ...],
    now: datetime,
    healthy_age: timedelta,
    error_age: timedelta,
) -> HealthCheck:
    latest = _latest_run(job_names)
    if latest is None or latest.finished_at is None:
        return HealthCheck(name, HealthStatus.ERROR, "no successful ingestion run found")
    return _classify_freshness(
        name,
        _as_utc(latest.finished_at),
        now,
        healthy_age,
        error_age,
    )


def _moneypuck_freshness_check(now: datetime) -> HealthCheck:
    # New coordinators enroll each source and season explicitly. Historical
    # backfills cannot refresh these records or disguise current-source failures.
    latest_parent = _latest_run(("daily_update",), successful_only=False)
    season_id = latest_parent.parameters.get("resolved_season_id") if latest_parent else None
    if season_id is not None:
        with session_scope() as session:
            has_final = session.scalar(
                select(Game.id)
                .where(
                    Game.season_id == season_id,
                    Game.state.in_(FINAL_GAME_STATES),
                    Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                    Game.game_date <= now.date(),
                )
                .limit(1)
            )
            work = list(
                session.scalars(
                    select(DailyWork).where(
                        DailyWork.season_id == season_id,
                        DailyWork.dataset.in_(
                            (
                                "moneypuck_season_summaries",
                                "moneypuck_team_games",
                                "moneypuck_player_games",
                                "moneypuck_shots",
                                "moneypuck_lines",
                            )
                        ),
                    )
                ).all()
            )
        if has_final is None:
            return HealthCheck(
                "moneypuck", HealthStatus.HEALTHY, "waiting for the season's first final game"
            )
        if len(work) != 5 or any(w.published_at is None for w in work):
            return HealthCheck(
                "moneypuck", HealthStatus.WARNING, "current-season source imports pending"
            )
        freshness = _classify_freshness(
            "moneypuck",
            min(_as_utc(w.published_at) for w in work if w.published_at is not None),
            now,
            MONEYPUCK_HEALTHY_AGE,
            MONEYPUCK_ERROR_AGE,
        )
        if any(w.status != "succeeded" for w in work) and freshness.status is HealthStatus.HEALTHY:
            return HealthCheck(
                "moneypuck", HealthStatus.WARNING, "current-season source retry pending"
            )
        return freshness
    completed: list[datetime] = []
    missing: list[str] = []
    for job_name in MONEYPUCK_JOBS:
        latest = _latest_run((job_name,))
        if latest is None or latest.finished_at is None:
            missing.append(job_name.removeprefix("ingest_moneypuck_"))
        else:
            completed.append(_as_utc(latest.finished_at))
    if missing:
        return HealthCheck(
            "moneypuck",
            HealthStatus.WARNING,
            f"no successful run for: {', '.join(missing)}",
        )
    oldest = min(completed)
    return _classify_freshness(
        "moneypuck",
        oldest,
        now,
        MONEYPUCK_HEALTHY_AGE,
        MONEYPUCK_ERROR_AGE,
    )


def _recent_game_checks(now: datetime, recent_days: int) -> tuple[HealthCheck, HealthCheck]:
    cutoff = now.date() - timedelta(days=recent_days)
    with session_scope() as session:
        game_ids = list(
            session.scalars(
                select(Game.id).where(
                    Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                    Game.state.in_(FINAL_GAME_STATES),
                    Game.game_date.between(cutoff, now.date()),
                )
            ).all()
        )
        if not game_ids:
            message = f"no final games in the last {recent_days} days"
            return (
                HealthCheck("recent_boxscores", HealthStatus.HEALTHY, message),
                HealthCheck("recent_play_by_play", HealthStatus.HEALTHY, message),
            )
        boxscore_game_ids = set(
            session.scalars(
                select(TeamGameStats.game_id)
                .where(TeamGameStats.game_id.in_(game_ids))
                .group_by(TeamGameStats.game_id)
                .having(func.count(TeamGameStats.id) == 2)
            ).all()
        )
        play_by_play_game_ids = set(
            session.scalars(
                select(GameEvent.game_id)
                .where(GameEvent.game_id.in_(game_ids))
                .group_by(GameEvent.game_id)
                .having(func.count(GameEvent.id) > 0)
            ).all()
        )
    return (
        _completeness_check("recent_boxscores", game_ids, boxscore_game_ids),
        _completeness_check("recent_play_by_play", game_ids, play_by_play_game_ids),
    )


def _completeness_check(
    name: str,
    expected_ids: list[int],
    completed_ids: set[int],
) -> HealthCheck:
    missing = len(set(expected_ids) - completed_ids)
    if not missing:
        return HealthCheck(
            name,
            HealthStatus.HEALTHY,
            f"{len(expected_ids)}/{len(expected_ids)} recent final games complete",
        )
    return HealthCheck(
        name,
        HealthStatus.ERROR,
        f"{len(expected_ids) - missing}/{len(expected_ids)} complete; {missing} missing",
    )


def _latest_run(
    job_names: tuple[str, ...],
    *,
    successful_only: bool = True,
) -> IngestionRun | None:
    statement = select(IngestionRun).where(IngestionRun.job_name.in_(job_names))
    if successful_only:
        statement = statement.where(IngestionRun.status == "succeeded")
    statement = statement.order_by(IngestionRun.started_at.desc()).limit(1)
    with session_scope() as session:
        return session.scalar(statement)


def _classify_freshness(
    name: str,
    observed_at: datetime,
    now: datetime,
    healthy_age: timedelta,
    error_age: timedelta,
) -> HealthCheck:
    age = max(now - observed_at, timedelta())
    if age <= healthy_age:
        status = HealthStatus.HEALTHY
    elif age <= error_age:
        status = HealthStatus.WARNING
    else:
        status = HealthStatus.ERROR
    return HealthCheck(
        name,
        status,
        f"last successful update {_format_age(age)} ago",
        observed_at,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _format_age(age: timedelta) -> str:
    total_minutes = max(0, int(age.total_seconds() // 60))
    hours, minutes = divmod(total_minutes, 60)
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"
