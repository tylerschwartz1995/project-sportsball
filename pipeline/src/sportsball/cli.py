"""Command-line entry points for pipeline development and operations."""

from datetime import date

import typer

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.multi_season_backfill import (
    SeasonBackfillSummary,
    backfill_season_range,
)
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
from sportsball.ingestion.orchestration.season_backfill import backfill_season_schedule
from sportsball.normalization.games import schedule_games_frame

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
