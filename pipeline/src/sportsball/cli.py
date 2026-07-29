"""Command-line entry points for pipeline development and operations."""

from datetime import date

import typer

from sportsball.clients.nhl.client import NhlClient
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


if __name__ == "__main__":
    app()
