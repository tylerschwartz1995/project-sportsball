"""Audited coordination of one bounded daily data refresh."""

import uuid
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, update

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.stats_client import NhlStatsClient
from sportsball.ingestion.orchestration.boxscores import BoxscoreIngestionResult, ingest_boxscore
from sportsball.ingestion.orchestration.daily_discovery import discover_season, recovery_seasons
from sportsball.ingestion.orchestration.descriptive import build_descriptive_analytics
from sportsball.ingestion.orchestration.historical_seasons import ingest_historical_seasons
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
from sportsball.ingestion.orchestration.play_by_play import (
    PlayByPlayIngestionResult,
    ingest_play_by_play,
)
from sportsball.ingestion.orchestration.player_profile_backfill import (
    backfill_player_profiles,
)
from sportsball.ingestion.orchestration.player_profiles import ingest_player_profile
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.ingestion.orchestration.season_stats import build_season_stats
from sportsball.ingestion.orchestration.standings import ingest_standings
from sportsball.operations.daily_state import (
    begin_work,
    coordinating_run,
    daily_lock,
    due_games,
    finish_work,
    missing_game_ids,
    park_nonfinal_games,
    pending_work,
    queue_games,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    GoalieGameStats,
    IngestionRun,
    Player,
    PlayerGameStats,
    Season,
)
from sportsball.validation.daily_coverage import moneypuck_coverage

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
    max_games: int = 100
    max_schedule_pages: int = 64

    def validate(self) -> None:
        """Reject invalid windows before creating an audited run."""
        if self.schedule_lookback_days < 0:
            raise ValueError("schedule_lookback_days cannot be negative")
        if self.schedule_lookahead_days < 0:
            raise ValueError("schedule_lookahead_days cannot be negative")
        if self.correction_days < 0:
            raise ValueError("correction_days cannot be negative")
        if self.max_games < 1 or self.max_schedule_pages < 1:
            raise ValueError("max_games and max_schedule_pages must be positive")
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
    warnings: tuple[str, ...] = ()

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

    with daily_lock():
        run_id = _start_daily_run(options)
        with coordinating_run(run_id):
            return _run_locked(options, nhl_client, moneypuck_client, run_id)


def _run_locked(
    options: DailyUpdateOptions,
    nhl_client: NhlClient,
    moneypuck_client: MoneyPuckClient | None,
    run_id: uuid.UUID,
) -> DailyUpdateResult:
    steps: list[DailyUpdateStep] = []
    failures: list[str] = []
    advanced_failures: list[str] = []
    warnings: list[str] = []
    games_refreshed = 0
    try:
        # Refresh the present first so season detection works on new installations.
        schedule_count = sum(
            ingest_schedule_date(anchor, nhl_client).games_processed
            for anchor in schedule_anchor_dates(options)
        )
        steps.append(DailyUpdateStep("nhl_schedules", schedule_count))
        season_id = _resolve_season_id(options)
        seasons = recovery_seasons(season_id, options.run_date)
        with session_scope() as session:
            parent = session.get(IngestionRun, run_id)
            assert parent is not None
            parent.parameters = {
                **parent.parameters,
                "resolved_season_id": season_id,
                "season_ids": seasons,
            }
        for selected_season in seasons:
            season_failures: list[str] = []
            try:
                count, discovered = discover_season(
                    selected_season,
                    options.run_date,
                    nhl_client,
                    max_pages=options.max_schedule_pages,
                )
                steps.append(DailyUpdateStep(f"schedule_discovery:{selected_season}", count))
                if not discovered:
                    season_failures.append("schedule catch-up has not reached the run date")
            except Exception as error:
                season_failures.append(f"schedule discovery: {error}")

            park_nonfinal_games(selected_season, options.run_date)
            candidates = _recent_final_game_ids(options, selected_season)
            queue_games(candidates, selected_season)
            game_ids = due_games(candidates)[: options.max_games]
            if len(candidates) > len(game_ids):
                season_failures.append(f"{len(candidates) - len(game_ids)} games remain queued")
            _refresh_recent_games(game_ids, nhl_client, steps, season_failures, selected_season)
            games_refreshed += len(game_ids)
            _refresh_recent_player_profiles(
                game_ids,
                nhl_client,
                steps,
                season_failures,
                selected_season,
            )
            if missing_game_ids(selected_season, options.run_date):
                season_failures.append("completed games still lack box scores or play-by-play")

            # Official published summaries are independent of our game imports.
            if _season_has_final_game(selected_season):
                with NhlStatsClient() as stats_client:
                    _attempt_step(
                        "historical_season_summaries",
                        lambda selected_season=selected_season: (
                            ingest_historical_seasons(
                                selected_season,
                                selected_season,
                                stats_client,
                            ).records_processed
                        ),
                        steps,
                        season_failures,
                        season_id=selected_season,
                    )
            if not season_failures:
                _attempt_step(
                    "derived_season_stats",
                    lambda selected_season=selected_season: (
                        build_season_stats(selected_season, selected_season).records_processed
                    ),
                    steps,
                    season_failures,
                    season_id=selected_season,
                )
                _attempt_step(
                    "official_player_seasons",
                    lambda selected_season=selected_season: (
                        build_official_player_seasons(
                            selected_season,
                            selected_season,
                        ).records_processed
                    ),
                    steps,
                    season_failures,
                    season_id=selected_season,
                )
            failures.extend(f"season {selected_season}: {message}" for message in season_failures)

            if options.include_moneypuck and _season_has_final_game(selected_season):
                assert moneypuck_client is not None
                _refresh_moneypuck(selected_season, moneypuck_client, steps, advanced_failures)
                coverage = moneypuck_coverage(selected_season, options.run_date)
                if begin_work(
                    "moneypuck_coverage", str(selected_season), selected_season, honor_retry=False
                ):
                    finish_work(
                        "moneypuck_coverage",
                        str(selected_season),
                        coverage=coverage,
                        waiting=bool(coverage["missing"]),
                    )
                if coverage["missing"]:
                    warnings.append(f"season {selected_season}: advanced game data pending")
            elif options.include_moneypuck:
                steps.append(DailyUpdateStep("moneypuck_waiting_for_final_game", 0))

        _attempt_step(
            "official_standings",
            lambda: ingest_standings(options.run_date, nhl_client).teams_processed,
            steps,
            failures,
            season_id=season_id,
        )
        profiles = backfill_player_profiles(
            nhl_client,
            max_players=options.max_new_profiles,
            retry_failed=True,
        )
        steps.append(DailyUpdateStep("new_player_profiles", profiles.attempted_this_run))
        failures.extend(
            f"player_profile:{f.player_id}: {f.error_message}" for f in profiles.failures
        )
        if not failures:
            _attempt_step(
                "descriptive_schedule_context",
                lambda: build_descriptive_analytics(history=False),
                steps,
                failures,
                season_id=season_id,
            )
    except Exception as error:
        _finish_daily_run(run_id, steps, failures=[*failures, str(error)])
        raise

    _finish_daily_run(
        run_id, steps, failures=failures, advanced_failures=[*advanced_failures, *warnings]
    )
    if failures or advanced_failures:
        raise DailyUpdateFailed("; ".join([*failures, *advanced_failures]))
    return DailyUpdateResult(
        run_id, options.run_date, season_id, games_refreshed, tuple(steps), tuple(warnings)
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
    season_id: int,
) -> None:
    for game_id in game_ids:
        _attempt_step(
            "boxscore",
            lambda game_id=game_id: _boxscore_count(ingest_boxscore(game_id, client)),
            steps,
            failures,
            season_id=season_id,
            key=str(game_id),
        )
        _attempt_step(
            "play_by_play",
            lambda game_id=game_id: _event_count(ingest_play_by_play(game_id, client)),
            steps,
            failures,
            season_id=season_id,
            key=str(game_id),
        )


def _boxscore_count(result: BoxscoreIngestionResult) -> int:
    return result.skaters_processed + result.goalies_processed + 2


def _event_count(result: PlayByPlayIngestionResult) -> int:
    return result.events_processed + result.participants_processed


def _refresh_recent_player_profiles(
    game_ids: list[int],
    client: NhlClient,
    steps: list[DailyUpdateStep],
    failures: list[str],
    season_id: int,
) -> None:
    player_ids = sorted(
        set(_recent_player_ids(game_ids))
        | {int(key) for key in pending_work("player_profile", season_id)}
    )
    for player_id in player_ids:
        _attempt_step(
            "player_profile",
            lambda player_id=player_id: _profile_count(player_id, client),
            steps,
            failures,
            season_id=season_id,
            key=str(player_id),
        )


def _profile_count(player_id: int, client: NhlClient) -> int:
    ingest_player_profile(player_id, client)
    return 1


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
        season_id=season_id,
    )
    _attempt_step(
        "moneypuck_team_games",
        lambda: ingest_moneypuck_team_games(season_id, season_id, client).rows_processed,
        steps,
        failures,
        season_id=season_id,
    )
    _attempt_step(
        "moneypuck_player_games",
        lambda: ingest_moneypuck_player_games(season_id, client).records_processed,
        steps,
        failures,
        season_id=season_id,
    )
    _attempt_step(
        "moneypuck_shots",
        lambda: ingest_moneypuck_shots(season_id, client).rows_processed,
        steps,
        failures,
        season_id=season_id,
    )
    _attempt_step(
        "moneypuck_lines",
        lambda: ingest_moneypuck_lines(season_id, client).rows_processed,
        steps,
        failures,
        season_id=season_id,
    )


def _attempt_step(
    name: str,
    operation: Callable[[], int],
    steps: list[DailyUpdateStep],
    failures: list[str],
    *,
    season_id: int,
    key: str | None = None,
) -> None:
    source_key = key or str(season_id)
    if not begin_work(name, source_key, season_id):
        failures.append(f"{name}:{source_key}: retry deferred until the next attempt time")
        return
    try:
        records_processed = operation()
    except Exception as error:
        finish_work(name, source_key, error=str(error))
        failures.append(f"{name}:{source_key}: {error}")
    else:
        finish_work(name, source_key)
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
    missing = missing_game_ids(season_id, options.run_date)
    pending = {
        int(key) for name in ("boxscore", "play_by_play") for key in pending_work(name, season_id)
    }
    with session_scope() as session:
        games = list(
            session.scalars(
                select(Game)
                .where(
                    Game.season_id == season_id,
                    Game.game_type.in_(NHL_SEASON_GAME_TYPES),
                    Game.state.in_(FINAL_GAME_STATES),
                    Game.game_date <= options.run_date,
                )
                .order_by(Game.game_date, Game.nhl_id)
            ).all()
        )
    # Missing/failed work gets priority so repeated busy nights cannot starve it.
    urgent = [g.nhl_id for g in games if g.nhl_id in missing | pending]
    recent = [g.nhl_id for g in games if g.game_date >= earliest_date and g.nhl_id not in urgent]
    return urgent + recent


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
                **asdict(options),
                "run_date": options.run_date.isoformat(),
                "coordination_version": 1,
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
    advanced_failures: list[str] | None = None,
) -> None:
    error_message = "; ".join([*(failures or []), *(advanced_failures or [])]) or None
    with session_scope() as session:
        session.execute(
            update(IngestionRun)
            .where(IngestionRun.id == run_id)
            .values(
                status="failed" if failures else "degraded" if advanced_failures else "succeeded",
                records_processed=sum(step.records_processed for step in steps),
                error_message=error_message,
                finished_at=datetime.now(UTC),
            )
        )
