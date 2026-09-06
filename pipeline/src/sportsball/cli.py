"""Stable command-line entry point for people and schedulers."""

import typer

from sportsball.commands import analytics, moneypuck, nhl, operations

app = typer.Typer(no_args_is_help=True)
for commands in (operations.app, nhl.app, moneypuck.app, analytics.app):
    app.registered_commands.extend(commands.registered_commands)


@app.callback()
def main() -> None:
    """Sportsball data ingestion, analytics, and operational checks."""


if __name__ == "__main__":
    app()
