"""Command-line entry points for pipeline development and operations."""

from datetime import date

import typer

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.boxscore_backfill import backfill_boxscores
from sportsball.ingestion.orchestration.boxscores import ingest_boxscore
from sportsball.ingestion.orchestration.game_outcomes import backfill_game_outcomes
from sportsball.ingestion.orchestration.moneypuck_lines import (
    backfill_moneypuck_lines,
    ingest_moneypuck_lines,
)
from sportsball.ingestion.orchestration.moneypuck_player_games import (
    backfill_moneypuck_player_games,
    ingest_moneypuck_player_games,
)
from sportsball.ingestion.orchestration.moneypuck_season_backfill import (
    backfill_moneypuck_seasons,
)
from sportsball.ingestion.orchestration.moneypuck_seasons import (
    ingest_moneypuck_season,
)
from sportsball.ingestion.orchestration.moneypuck_shots import (
    backfill_moneypuck_shots,
    ingest_moneypuck_shots,
)
from sportsball.ingestion.orchestration.moneypuck_team_games import (
    ingest_moneypuck_team_games,
)
from sportsball.ingestion.orchestration.moneypuck_unit_seasons import (
    build_moneypuck_unit_seasons,
)
from sportsball.ingestion.orchestration.multi_season_backfill import (
    SeasonBackfillSummary,
    backfill_season_range,
)
from sportsball.ingestion.orchestration.official_player_seasons import (
    build_official_player_seasons,
)
from sportsball.ingestion.orchestration.play_by_play import ingest_play_by_play
from sportsball.ingestion.orchestration.play_by_play_backfill import (
    backfill_play_by_play,
)
from sportsball.ingestion.orchestration.player_profile_backfill import (
    backfill_player_profiles,
)
from sportsball.ingestion.orchestration.player_profiles import ingest_player_profile
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.ingestion.orchestration.season_backfill import backfill_season_schedule
from sportsball.ingestion.orchestration.season_stats import build_season_stats
from sportsball.ingestion.orchestration.standings import ingest_standings
from sportsball.ingestion.orchestration.standings_backfill import (
    backfill_final_standings,
)
from sportsball.normalization.games import schedule_games_frame
from sportsball.validation.completeness import (
    audit_completeness,
    format_season_audit,
)

app = typer.Typer(no_args_is_help=True)


@app.callback()
def main() -> None:
    """Run Sportsball data-pipeline development commands."""


@app.command()
def schedule(game_date: str) -> None:
    """Fetch and display the NHL schedule for one date."""
    try:
        parsed_date = date.fromisoformat(game_date)
    except ValueError as error:
        raise typer.BadParameter("expected an ISO date in YYYY-MM-DD format") from error

    with NhlClient() as client:
        response = client.get_schedule(parsed_date)

    typer.echo(schedule_games_frame(response))


@app.command()
def ingest_schedule(game_date: str) -> None:
    """Ingest one NHL schedule date into PostgreSQL."""
    try:
        parsed_date = date.fromisoformat(game_date)
    except ValueError as error:
        raise typer.BadParameter("expected an ISO date in YYYY-MM-DD format") from error

    with NhlClient() as client:
        result = ingest_schedule_date(parsed_date, client)

    typer.echo(
        f"run={result.run_id} date={result.game_date.isoformat()} "
        f"games_processed={result.games_processed}"
    )


@app.command()
def ingest_game_boxscore(game_id: int) -> None:
    """Ingest one stored NHL game's box score and player statistics."""
    with NhlClient() as client:
        result = ingest_boxscore(game_id, client)

    typer.echo(
        f"run={result.run_id} game={result.game_id} "
        f"skaters_processed={result.skaters_processed} "
        f"goalies_processed={result.goalies_processed}"
    )


@app.command()
def ingest_game_play_by_play(game_id: int) -> None:
    """Ingest one stored NHL game's normalized event timeline."""
    with NhlClient() as client:
        result = ingest_play_by_play(game_id, client)

    typer.echo(
        f"run={result.run_id} game={result.game_id} "
        f"events_processed={result.events_processed} "
        f"participants_processed={result.participants_processed}"
    )


@app.command()
def ingest_player(player_id: int) -> None:
    """Ingest one canonical NHL player's landing profile."""
    with NhlClient() as client:
        result = ingest_player_profile(player_id, client)
    typer.echo(f"run={result.run_id} player={result.player_id}")


@app.command()
def ingest_official_standings(snapshot_date: str) -> None:
    """Ingest the NHL-published standings snapshot for one date."""
    try:
        parsed_date = date.fromisoformat(snapshot_date)
    except ValueError as error:
        raise typer.BadParameter("expected an ISO date in YYYY-MM-DD format") from error
    with NhlClient() as client:
        result = ingest_standings(parsed_date, client)
    typer.echo(
        f"run={result.run_id} date={result.snapshot_date.isoformat()} "
        f"season={result.season_id} teams_processed={result.teams_processed}"
    )


@app.command()
def ingest_moneypuck_season_summary(season_id: int) -> None:
    """Ingest MoneyPuck skater, goalie, and team season summaries."""
    with MoneyPuckClient() as client:
        try:
            result = ingest_moneypuck_season(season_id, client)
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} season={result.season_id} "
        f"skaters={result.skaters_processed} goalies={result.goalies_processed} "
        f"teams={result.teams_processed} total={result.records_processed}"
    )


@app.command()
def backfill_moneypuck_season_summaries(
    start_season: int,
    end_season: int,
    max_seasons: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill MoneyPuck season summaries across an inclusive range."""
    with MoneyPuckClient() as client:
        try:
            result = backfill_moneypuck_seasons(
                start_season,
                end_season,
                client,
                max_seasons=max_seasons,
                retry_failed=retry_failed,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} "
        f"completed={result.completed_seasons}/{result.total_seasons} "
        f"pending={result.pending_seasons} failed={result.failed_seasons}"
    )
    for failure in result.failures:
        typer.echo(
            f"  season={failure.season_id} error={failure.error_message}",
            err=True,
        )
    if result.failures and result.pending_seasons == 0:
        raise typer.Exit(code=1)


@app.command()
def ingest_moneypuck_team_game_stats(
    start_season: int,
    end_season: int,
) -> None:
    """Ingest MoneyPuck all-team game-level metrics for a season range."""
    with MoneyPuckClient() as client:
        try:
            result = ingest_moneypuck_team_games(
                start_season,
                end_season,
                client,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} seasons={result.start_season}-{result.end_season} "
        f"rows_processed={result.rows_processed}"
    )


@app.command()
def ingest_moneypuck_player_game_stats(season_id: int) -> None:
    """Ingest MoneyPuck skater and goalie game metrics for one regular season."""
    with MoneyPuckClient() as client:
        try:
            result = ingest_moneypuck_player_games(season_id, client)
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} season={result.season_id} "
        f"skaters={result.skaters_processed} goalies={result.goalies_processed} "
        f"total={result.records_processed}"
    )


@app.command()
def backfill_moneypuck_player_game_stats(
    start_season: int,
    end_season: int,
    max_seasons: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill MoneyPuck regular-season player game metrics."""
    with MoneyPuckClient() as client:
        try:
            result = backfill_moneypuck_player_games(
                start_season,
                end_season,
                client,
                max_seasons=max_seasons,
                retry_failed=retry_failed,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} "
        f"completed={result.completed_seasons}/{result.total_seasons} "
        f"pending={result.pending_seasons} failed={result.failed_seasons}"
    )
    for failure in result.failures:
        typer.echo(
            f"  season={failure.season_id} error={failure.error_message}",
            err=True,
        )
    if result.failures and result.pending_seasons == 0:
        raise typer.Exit(code=1)


@app.command()
def ingest_moneypuck_shot_stats(season_id: int) -> None:
    """Ingest one season of MoneyPuck shot-level data."""
    with MoneyPuckClient() as client:
        try:
            result = ingest_moneypuck_shots(season_id, client)
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} season={result.season_id} rows_processed={result.rows_processed}"
    )


@app.command()
def backfill_moneypuck_shot_stats(
    start_season: int,
    end_season: int,
    max_seasons: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill MoneyPuck shot-level data across a season range."""
    with MoneyPuckClient() as client:
        try:
            result = backfill_moneypuck_shots(
                start_season,
                end_season,
                client,
                max_seasons=max_seasons,
                retry_failed=retry_failed,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} "
        f"completed={result.completed_seasons}/{result.total_seasons} "
        f"pending={result.pending_seasons} failed={result.failed_seasons}"
    )
    for season_id, message in result.failures:
        typer.echo(f"  season={season_id} error={message}", err=True)
    if result.failures and result.pending_seasons == 0:
        raise typer.Exit(code=1)


@app.command()
def ingest_moneypuck_line_stats(season_id: int) -> None:
    """Ingest MoneyPuck forward-line and defensive-pairing game data."""
    with MoneyPuckClient() as client:
        try:
            result = ingest_moneypuck_lines(season_id, client)
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} season={result.season_id} rows_processed={result.rows_processed}"
    )


@app.command()
def backfill_moneypuck_line_stats(
    start_season: int,
    end_season: int,
    max_seasons: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill MoneyPuck line and pairing metrics."""
    with MoneyPuckClient() as client:
        try:
            result = backfill_moneypuck_lines(
                start_season,
                end_season,
                client,
                max_seasons=max_seasons,
                retry_failed=retry_failed,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} "
        f"completed={result.completed_seasons}/{result.total_seasons} "
        f"pending={result.pending_seasons} failed={result.failed_seasons}"
    )
    for season_id, message in result.failures:
        typer.echo(f"  season={season_id} error={message}", err=True)
    if result.failures and result.pending_seasons == 0:
        raise typer.Exit(code=1)


@app.command()
def backfill_official_standings(
    start_season: int,
    end_season: int,
    max_seasons: int | None = None,
) -> None:
    """Backfill missing NHL-published final regular-season standings."""
    with NhlClient() as client:
        try:
            result = backfill_final_standings(
                start_season,
                end_season,
                client,
                max_seasons=max_seasons,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} "
        f"completed={result.completed_seasons}/{result.total_seasons} "
        f"failed={len(result.failures)}"
    )
    for failure in result.failures:
        typer.echo(
            f"  season={failure.season_id} date={failure.snapshot_date} "
            f"error={failure.error_message}",
            err=True,
        )
    if result.failures:
        raise typer.Exit(code=1)


@app.command()
def backfill_game_boxscores(
    start_season: int,
    end_season: int,
    max_games: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill missing box scores across an inclusive stored season range."""
    with NhlClient() as client:
        try:
            result = backfill_boxscores(
                start_season,
                end_season,
                client,
                max_games=max_games,
                retry_failed=retry_failed,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error

    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} completed={result.completed_games}/"
        f"{result.total_games} pending={result.pending_games} "
        f"failed={result.failed_games}"
    )
    for failure in result.failures:
        typer.echo(f"  game={failure.game_id} error={failure.error_message}", err=True)
    if result.failed_games and result.pending_games == 0:
        raise typer.Exit(code=1)


@app.command()
def backfill_game_play_by_play(
    start_season: int,
    end_season: int,
    max_games: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill missing event timelines across a stored season range."""
    attempted = 0

    def echo_progress(game_id: int, status: str) -> None:
        nonlocal attempted
        attempted += 1
        if attempted % 100 == 0 or status == "failed":
            typer.echo(f"progress attempted={attempted} game={game_id} status={status}")

    with NhlClient() as client:
        try:
            result = backfill_play_by_play(
                start_season,
                end_season,
                client,
                max_games=max_games,
                retry_failed=retry_failed,
                on_game_complete=echo_progress,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error

    typer.echo(
        f"seasons={result.start_season}-{result.end_season} "
        f"attempted={result.attempted_this_run} completed={result.completed_games}/"
        f"{result.total_games} pending={result.pending_games} "
        f"failed={result.failed_games}"
    )
    for failure in result.failures:
        typer.echo(f"  game={failure.game_id} error={failure.error_message}", err=True)
    if result.failed_games and result.pending_games == 0:
        raise typer.Exit(code=1)


@app.command()
def backfill_players(
    max_players: int | None = None,
    retry_failed: bool = False,
) -> None:
    """Backfill missing profiles for all canonical players."""
    attempted = 0

    def echo_progress(player_id: int, status: str) -> None:
        nonlocal attempted
        attempted += 1
        if attempted % 100 == 0 or status == "failed":
            typer.echo(f"progress attempted={attempted} player={player_id} status={status}")

    with NhlClient() as client:
        try:
            result = backfill_player_profiles(
                client,
                max_players=max_players,
                retry_failed=retry_failed,
                on_player_complete=echo_progress,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"attempted={result.attempted_this_run} "
        f"completed={result.completed_players}/{result.total_players} "
        f"pending={result.pending_players} failed={result.failed_players}"
    )
    for failure in result.failures:
        typer.echo(
            f"  player={failure.player_id} error={failure.error_message}",
            err=True,
        )
    if result.failed_players and result.pending_players == 0:
        raise typer.Exit(code=1)


@app.command()
def backfill_season(season_id: int, max_requests: int | None = None) -> None:
    """Resume a season schedule backfill, optionally limiting this invocation."""
    with NhlClient() as client:
        try:
            result = backfill_season_schedule(
                season_id,
                client,
                max_requests=max_requests,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error

    next_date = result.next_date.isoformat() if result.next_date is not None else "none"
    typer.echo(
        f"season={result.season_id} status={result.status} "
        f"requests_completed={result.requests_completed} "
        f"games_processed={result.games_processed} next_date={next_date}"
    )


@app.command()
def backfill_seasons(
    start_season: int,
    end_season: int,
    max_seasons: int | None = None,
) -> None:
    """Backfill and reconcile an inclusive range of NHL seasons."""
    with NhlClient() as client:
        try:
            result = backfill_season_range(
                start_season,
                end_season,
                client,
                max_seasons=max_seasons,
                on_season_complete=_echo_season_summary,
            )
        except ValueError as error:
            raise typer.BadParameter(str(error)) from error

    typer.echo(f"completed={result.completed} skipped={result.skipped} failed={result.failed}")
    if result.failed:
        raise typer.Exit(code=1)


@app.command("build-season-stats")
def build_season_stats_command(start_season: int, end_season: int) -> None:
    """Build materialized skater, goalie, and team season statistics."""
    try:
        result = build_season_stats(start_season, end_season)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error

    typer.echo(
        f"run={result.run_id} seasons={result.start_season}-{result.end_season} "
        f"skaters={result.skaters_processed} goalies={result.goalies_processed} "
        f"teams={result.teams_processed} total={result.records_processed}"
    )


@app.command("build-moneypuck-unit-seasons")
def build_moneypuck_unit_seasons_command(
    start_season: int,
    end_season: int,
) -> None:
    """Build Polars-derived season totals for lines and pairings."""
    try:
        result = build_moneypuck_unit_seasons(start_season, end_season)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} seasons={result.start_season}-{result.end_season} "
        f"units={result.rows_processed}"
    )


@app.command("build-official-player-season-stats")
def build_official_player_season_stats_command(
    start_season: int,
    end_season: int,
) -> None:
    """Materialize NHL-published player team splits from retained profiles."""
    try:
        result = build_official_player_seasons(start_season, end_season)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error
    typer.echo(
        f"run={result.run_id} seasons={result.start_season}-{result.end_season} "
        f"skaters={result.skaters_processed} goalies={result.goalies_processed} "
        f"total={result.records_processed}"
    )


@app.command("backfill-game-outcomes")
def backfill_game_outcomes_command(start_season: int, end_season: int) -> None:
    """Backfill game ending types from retained NHL boxscore payloads."""
    try:
        result = backfill_game_outcomes(start_season, end_season)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error

    typer.echo(
        f"run={result.run_id} seasons={result.start_season}-{result.end_season} "
        f"games_processed={result.games_processed}"
    )


@app.command("audit-data-completeness")
def audit_data_completeness_command(
    start_season: int,
    end_season: int,
    warnings_as_errors: bool = False,
) -> None:
    """Audit stored NHL and MoneyPuck coverage without changing data."""
    try:
        result = audit_completeness(start_season, end_season)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error

    for season in result.seasons:
        for line in format_season_audit(season):
            typer.echo(line)
    typer.echo(
        f"summary seasons={len(result.seasons)} passed={result.passed_seasons} "
        f"errors={result.errors} warnings={result.warnings}"
    )
    if result.errors or (warnings_as_errors and result.warnings):
        raise typer.Exit(code=1)


def _echo_season_summary(season: SeasonBackfillSummary) -> None:
    """Print one season as soon as the coordinator finishes it."""
    typer.echo(
        f"season={season.season_id} status={season.status} "
        f"stored_games={season.stored_games} expected_games={season.expected_games}"
    )
    if season.error_message is not None:
        typer.echo(f"  error={season.error_message}", err=True)


if __name__ == "__main__":
    app()
