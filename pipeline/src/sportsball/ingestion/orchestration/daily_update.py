"""Audited coordination of one bounded daily data refresh."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, update

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.boxscores import ingest_boxscore
from sportsball.ingestion.orchestration.moneypuck_lines import ingest_moneypuck_lines
from sportsball.ingestion.orchestration.moneypuck_player_games import (
    ingest_moneypuck_player_games,
)
from sportsball.ingestion.orchestration.moneypuck_seasons import ingest_moneypuck_season
from sportsball.ingestion.orchestration.moneypuck_shots import ingest_moneypuck_shots
from sportsball.ingestion.orchestration.moneypuck_team_games import (
    ingest_moneypuck_team_games,
)
from sportsball.ingestion.orchestration.official_player_seasons import (
    build_official_player_seasons,
)
from sportsball.ingestion.orchestration.play_by_play import ingest_play_by_play
from sportsball.ingestion.orchestration.player_profile_backfill import (
    backfill_player_profiles,
)
from sportsball.ingestion.orchestration.player_profiles import ingest_player_profile
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.ingestion.orchestration.season_stats import build_season_stats
from sportsball.ingestion.orchestration.standings import ingest_standings
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    GoalieGameStats,
    IngestionRun,
    Player,
    PlayerGameStats,
    Season,
)

FINAL_GAME_STATES = ("FINAL", "OFF")
NHL_SEASON_GAME_TYPES = (2, 3)


@dataclass(frozen=True)
class DailyUpdateOptions:
    """Boundaries and optional sources for one daily refresh."""

    run_date: date
    season_id: int | None = None
    schedule_lookback_days: int = 3
    schedule_lookahead_days: int = 7
    correction_days: int = 3
    max_new_profiles: int = 100
    include_moneypuck: bool = True

    def validate(self) -> None:
        """Reject invalid windows before creating an audited run."""
        if self.schedule_lookback_days < 0:
            raise ValueError("schedule_lookback_days cannot be negative")
        if self.schedule_lookahead_days < 0:
            raise ValueError("schedule_lookahead_days cannot be negative")
        if self.correction_days < 0:
            raise ValueError("correction_days cannot be negative")
        if self.max_new_profiles < 1:
            raise ValueError("max_new_profiles must be at least 1")


@dataclass(frozen=True)
class DailyUpdateStep:
    """One completed source or materialization within the daily update."""

    name: str
    records_processed: int


@dataclass(frozen=True)
class DailyUpdateResult:
    """Summary of a successful daily refresh."""

    run_id: uuid.UUID
    run_date: date
    season_id: int
    games_refreshed: int
    steps: tuple[DailyUpdateStep, ...]

    @property
    def records_processed(self) -> int:
        """Return all records reported by child jobs."""
        return sum(step.records_processed for step in self.steps)


class DailyUpdateFailed(RuntimeError):
    """Raised after all independent daily steps have been attempted."""


def run_daily_update(
    options: DailyUpdateOptions,
    nhl_client: NhlClient,
    moneypuck_client: MoneyPuckClient | None,
) -> DailyUpdateResult:
    """Refresh recent NHL facts and current-season derived datasets."""
    options.validate()
    if options.include_moneypuck and moneypuck_client is None:
        raise ValueError("moneypuck_client is required when MoneyPuck is enabled")

    run_id = _start_daily_run(options)
    steps: list[DailyUpdateStep] = []
    failures: list[str] = []
    try:
        schedule_count = sum(
            ingest_schedule_date(anchor, nhl_client).games_processed
            for anchor in schedule_anchor_dates(options)
        )
        steps.append(DailyUpdateStep("nhl_schedules", schedule_count))

        season_id = _resolve_season_id(options)
        game_ids = _recent_final_game_ids(options, season_id)
        _refresh_recent_games(game_ids, nhl_client, steps, failures)
        _refresh_recent_player_profiles(game_ids, nhl_client, steps, failures)

        profiles = backfill_player_profiles(
            nhl_client,
            max_players=options.max_new_profiles,
            retry_failed=True,
        )
        steps.append(DailyUpdateStep("new_player_profiles", profiles.attempted_this_run))
        failures.extend(
            f"player_profile:{failure.player_id}: {failure.error_message}"
            for failure in profiles.failures
        )

        _attempt_step(
            "official_standings",
            lambda: ingest_standings(options.run_date, nhl_client).teams_processed,
            steps,
            failures,
        )
        _attempt_step(
            "derived_season_stats",
            lambda: build_season_stats(season_id, season_id).records_processed,
            steps,
            failures,
        )
        _attempt_step(
            "official_player_seasons",
            lambda: build_official_player_seasons(season_id, season_id).records_processed,
            steps,
            failures,
        )

        if options.include_moneypuck and _season_has_final_game(season_id):
            assert moneypuck_client is not None
            _refresh_moneypuck(season_id, moneypuck_client, steps, failures)
        elif options.include_moneypuck:
            steps.append(DailyUpdateStep("moneypuck_waiting_for_final_game", 0))
    except Exception as error:
        _finish_daily_run(run_id, steps, failures=[*failures, str(error)])
        raise

    if failures:
        _finish_daily_run(run_id, steps, failures=failures)
        raise DailyUpdateFailed("; ".join(failures))

    _finish_daily_run(run_id, steps)
    return DailyUpdateResult(
        run_id=run_id,
        run_date=options.run_date,
        season_id=season_id,
        games_refreshed=len(game_ids),
        steps=tuple(steps),
    )


def schedule_anchor_dates(options: DailyUpdateOptions) -> tuple[date, ...]:
    """Return weekly anchors covering the requested schedule window."""
    options.validate()
    window_start = options.run_date - timedelta(days=options.schedule_lookback_days)
    window_end = options.run_date + timedelta(days=options.schedule_lookahead_days)
    anchors: list[date] = []
    anchor = window_start
    while anchor <= window_end:
        anchors.append(anchor)
        anchor += timedelta(days=7)
    return tuple(anchors)


def _refresh_recent_games(
    game_ids: list[int],
    client: NhlClient,
    steps: list[DailyUpdateStep],
    failures: list[str],
) -> None:
    boxscore_records = 0
    play_by_play_records = 0
    for game_id in game_ids:
        try:
            boxscore = ingest_boxscore(game_id, client)
            boxscore_records += boxscore.skaters_processed + boxscore.goalies_processed + 2
        except Exception as error:
            failures.append(f"boxscore:{game_id}: {error}")
        try:
            play_by_play = ingest_play_by_play(game_id, client)
            play_by_play_records += (
                play_by_play.events_processed + play_by_play.participants_processed
            )
        except Exception as error:
            failures.append(f"play_by_play:{game_id}: {error}")
    steps.extend(
        (
            DailyUpdateStep("recent_boxscores", boxscore_records),
            DailyUpdateStep("recent_play_by_play", play_by_play_records),
        )
    )


def _refresh_recent_player_profiles(
    game_ids: list[int],
    client: NhlClient,
    steps: list[DailyUpdateStep],
    failures: list[str],
) -> None:
    player_ids = _recent_player_ids(game_ids)
    refreshed = 0
    for player_id in player_ids:
        try:
            ingest_player_profile(player_id, client)
        except Exception as error:
            failures.append(f"player_profile:{player_id}: {error}")
        else:
            refreshed += 1
    steps.append(DailyUpdateStep("recent_player_profiles", refreshed))


def _refresh_moneypuck(
    season_id: int,
    client: MoneyPuckClient,
    steps: list[DailyUpdateStep],
    failures: list[str],
) -> None:
    _attempt_step(
        "moneypuck_season_summaries",
        lambda: ingest_moneypuck_season(season_id, client).records_processed,
        steps,
        failures,
    )
    _attempt_step(
        "moneypuck_team_games",
        lambda: ingest_moneypuck_team_games(season_id, season_id, client).rows_processed,
        steps,
        failures,
    )
    _attempt_step(
        "moneypuck_player_games",
        lambda: ingest_moneypuck_player_games(season_id, client).records_processed,
        steps,
        failures,
    )
    _attempt_step(
        "moneypuck_shots",
        lambda: ingest_moneypuck_shots(season_id, client).rows_processed,
        steps,
        failures,
    )
    _attempt_step(
        "moneypuck_lines",
        lambda: ingest_moneypuck_lines(season_id, client).rows_processed,
        steps,
        failures,
    )


def _attempt_step(
    name: str,
    operation: Callable[[], int],
    steps: list[DailyUpdateStep],
    failures: list[str],
) -> None:
    try:
        records_processed = operation()
    except Exception as error:
        failures.append(f"{name}: {error}")
    else:
        steps.append(DailyUpdateStep(name, records_processed))


def _resolve_season_id(options: DailyUpdateOptions) -> int:
    if options.season_id is not None:
        with session_scope() as session:
            if session.get(Season, options.season_id) is None:
                raise ValueError(
                    f"season does not exist after schedule refresh: {options.season_id}"
                )
        return options.season_id

    window_end = options.run_date + timedelta(days=options.schedule_lookahead_days)
    with session_scope() as session:
        season_id = session.scalar(
            select(Game.season_id)
            .where(
                Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                Game.game_date <= window_end,
            )
            .order_by(Game.game_date.desc(), Game.nhl_id.desc())
            .limit(1)
        )
    if season_id is None:
        raise ValueError("cannot resolve a season from the stored schedule")
    return season_id


def _recent_final_game_ids(options: DailyUpdateOptions, season_id: int) -> list[int]:
    earliest_date = options.run_date - timedelta(days=options.correction_days)
    with session_scope() as session:
        return list(
            session.scalars(
                select(Game.nhl_id)
                .where(
                    Game.season_id == season_id,
                    Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                    Game.state.in_(FINAL_GAME_STATES),
                    Game.game_date.between(earliest_date, options.run_date),
                )
                .order_by(Game.game_date, Game.nhl_id)
            ).all()
        )


def _season_has_final_game(season_id: int) -> bool:
    with session_scope() as session:
        return (
            session.scalar(
                select(Game.id)
                .where(
                    Game.season_id == season_id,
                    Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                    Game.state.in_(FINAL_GAME_STATES),
                )
                .limit(1)
            )
            is not None
        )


def _recent_player_ids(game_ids: list[int]) -> list[int]:
    if not game_ids:
        return []
    game_pks = select(Game.id).where(Game.nhl_id.in_(game_ids))
    skaters = (
        select(Player.nhl_id)
        .join(PlayerGameStats, PlayerGameStats.player_id == Player.id)
        .where(PlayerGameStats.game_id.in_(game_pks))
    )
    goalies = (
        select(Player.nhl_id)
        .join(GoalieGameStats, GoalieGameStats.player_id == Player.id)
        .where(GoalieGameStats.game_id.in_(game_pks))
    )
    with session_scope() as session:
        return sorted(set(session.scalars(skaters).all()) | set(session.scalars(goalies).all()))


def _start_daily_run(options: DailyUpdateOptions) -> uuid.UUID:
    with session_scope() as session:
        run = IngestionRun(
            job_name="daily_update",
            status="running",
            parameters={
                "run_date": options.run_date.isoformat(),
                "season_id": options.season_id,
                "schedule_lookback_days": options.schedule_lookback_days,
                "schedule_lookahead_days": options.schedule_lookahead_days,
                "correction_days": options.correction_days,
                "max_new_profiles": options.max_new_profiles,
                "include_moneypuck": options.include_moneypuck,
            },
        )
        session.add(run)
        session.flush()
        return run.id


def _finish_daily_run(
    run_id: uuid.UUID,
    steps: list[DailyUpdateStep],
    *,
    failures: list[str] | None = None,
) -> None:
    error_message = "; ".join(failures) if failures else None
    with session_scope() as session:
        session.execute(
            update(IngestionRun)
            .where(IngestionRun.id == run_id)
            .values(
                status="failed" if failures else "succeeded",
                records_processed=sum(step.records_processed for step in steps),
                error_message=error_message,
                finished_at=datetime.now(UTC),
            )
        )
