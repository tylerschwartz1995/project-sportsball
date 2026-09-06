"""Preserve the public CLI names and parameters consumed by scripts and schedulers."""

from typer.core import TyperGroup
from typer.main import get_command

from sportsball.cli import app


def test_existing_command_contracts_are_preserved() -> None:
    group = get_command(app)
    assert isinstance(group, TyperGroup)
    expected = {
        "daily-update": [
            "run_date",
            "season_id",
            "schedule_lookback_days",
            "schedule_lookahead_days",
            "correction_days",
            "max_new_profiles",
            "skip_moneypuck",
        ],
        "check-data-health": ["recent_days", "warnings_as_errors"],
        "reconcile-abandoned-runs": ["older_than_hours", "apply"],
        "schedule": ["game_date"],
        "ingest-schedule": ["game_date"],
        "ingest-game-boxscore": ["game_id"],
        "ingest-game-play-by-play": ["game_id"],
        "ingest-player": ["player_id"],
        "ingest-official-standings": ["snapshot_date"],
        "ingest-moneypuck-season-summary": ["season_id"],
        "backfill-moneypuck-season-summaries": [
            "start_season",
            "end_season",
            "max_seasons",
            "retry_failed",
        ],
        "ingest-moneypuck-team-game-stats": ["start_season", "end_season"],
        "ingest-moneypuck-player-game-stats": ["season_id"],
        "backfill-moneypuck-player-game-stats": [
            "start_season",
            "end_season",
            "max_seasons",
            "retry_failed",
        ],
        "ingest-moneypuck-shot-stats": ["season_id"],
        "backfill-moneypuck-shot-stats": [
            "start_season",
            "end_season",
            "max_seasons",
            "retry_failed",
        ],
        "ingest-moneypuck-line-stats": ["season_id"],
        "backfill-moneypuck-line-stats": [
            "start_season",
            "end_season",
            "max_seasons",
            "retry_failed",
        ],
        "backfill-official-standings": ["start_season", "end_season", "max_seasons"],
        "backfill-game-boxscores": ["start_season", "end_season", "max_games", "retry_failed"],
        "backfill-game-play-by-play": ["start_season", "end_season", "max_games", "retry_failed"],
        "backfill-players": ["max_players", "retry_failed"],
        "backfill-season": ["season_id", "max_requests"],
        "backfill-seasons": ["start_season", "end_season", "max_seasons"],
        "build-season-stats": ["start_season", "end_season"],
        "ingest-historical-seasons": ["start_season", "end_season"],
        "ingest-draft-history": ["start_year", "end_year"],
        "build-moneypuck-unit-seasons": ["start_season", "end_season"],
        "build-official-player-season-stats": ["start_season", "end_season"],
        "backfill-game-outcomes": ["start_season", "end_season"],
        "audit-data-completeness": ["start_season", "end_season", "warnings_as_errors"],
    }
    for name, parameters in expected.items():
        command = group.commands[name]
        assert [parameter.name for parameter in command.params] == parameters
