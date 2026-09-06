"""Moneypuck command adapters."""

import typer

from sportsball.clients.moneypuck.client import MoneyPuckClient
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

app = typer.Typer()


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
