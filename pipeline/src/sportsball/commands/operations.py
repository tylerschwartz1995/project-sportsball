"""Operations command adapters."""

from datetime import UTC, date, datetime, timedelta

import typer

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.daily_update import (
    DailyUpdateFailed,
    DailyUpdateOptions,
    run_daily_update,
)
from sportsball.operations.ingestion_recovery import reconcile_abandoned_runs
from sportsball.validation.completeness import (
    audit_completeness,
    format_season_audit,
)
from sportsball.validation.data_health import (
    HealthStatus,
    check_data_health,
    format_data_health,
)

app = typer.Typer()


@app.command("daily-update")
def daily_update_command(
    run_date: str | None = None,
    season_id: int | None = None,
    schedule_lookback_days: int = 3,
    schedule_lookahead_days: int = 7,
    correction_days: int = 3,
    max_new_profiles: int = 100,
    skip_moneypuck: bool = False,
) -> None:
    """Refresh recent NHL facts and current-season derived datasets."""
    if run_date is None:
        parsed_date = datetime.now(UTC).date()
    else:
        try:
            parsed_date = date.fromisoformat(run_date)
        except ValueError as error:
            raise typer.BadParameter("expected an ISO date in YYYY-MM-DD format") from error

    options = DailyUpdateOptions(
        run_date=parsed_date,
        season_id=season_id,
        schedule_lookback_days=schedule_lookback_days,
        schedule_lookahead_days=schedule_lookahead_days,
        correction_days=correction_days,
        max_new_profiles=max_new_profiles,
        include_moneypuck=not skip_moneypuck,
    )
    try:
        with NhlClient() as nhl_client, MoneyPuckClient() as moneypuck_client:
            result = run_daily_update(options, nhl_client, moneypuck_client)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error
    except DailyUpdateFailed as error:
        typer.echo(f"daily update completed with failures: {error}", err=True)
        raise typer.Exit(code=1) from error

    typer.echo(
        f"run={result.run_id} date={result.run_date} season={result.season_id} "
        f"games_refreshed={result.games_refreshed} "
        f"records_processed={result.records_processed}"
    )
    for step in result.steps:
        typer.echo(f"  step={step.name} records_processed={step.records_processed}")


@app.command("check-data-health")
def check_data_health_command(
    recent_days: int = 3,
    warnings_as_errors: bool = False,
) -> None:
    """Check ingestion freshness and recent final-game completeness."""
    try:
        report = check_data_health(recent_days=recent_days)
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error

    for line in format_data_health(report):
        typer.echo(line)
    if report.status is HealthStatus.ERROR or (
        warnings_as_errors and report.status is HealthStatus.WARNING
    ):
        raise typer.Exit(code=1)


@app.command("reconcile-abandoned-runs")
def reconcile_abandoned_runs_command(
    older_than_hours: int = 2,
    apply: bool = False,
) -> None:
    """Find interrupted runs and fail only those superseded by later successes."""
    try:
        result = reconcile_abandoned_runs(
            older_than=timedelta(hours=older_than_hours),
            apply=apply,
        )
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error

    mode = "apply" if apply else "dry-run"
    typer.echo(
        f"mode={mode} abandoned={len(result.runs)} "
        f"superseded={result.superseded} unresolved={result.unresolved} "
        f"reconciled={result.reconciled}"
    )
    for run in result.runs:
        superseding = str(run.superseding_run_id) if run.superseding_run_id else "none"
        typer.echo(
            f"  run={run.run_id} job={run.job_name} "
            f"started_at={run.started_at.isoformat()} superseding_run={superseding}"
        )
    if not apply and result.superseded:
        typer.echo("dry-run only; rerun with --apply to mark superseded records failed")
    if result.unresolved:
        typer.echo("unresolved records were not changed", err=True)


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
