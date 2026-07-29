"""Command-line entry points for pipeline development and operations."""

from datetime import date

import typer

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.schedules import ingest_schedule_date
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


if __name__ == "__main__":
    app()
