"""Analytics command adapters."""

import typer

from sportsball.ingestion.orchestration.moneypuck_unit_seasons import (
    build_moneypuck_unit_seasons,
)
from sportsball.ingestion.orchestration.official_player_seasons import (
    build_official_player_seasons,
)
from sportsball.ingestion.orchestration.season_stats import build_season_stats

app = typer.Typer()


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
