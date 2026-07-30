"""Tests for bounded daily ingestion coordination."""

import os
import uuid
from datetime import UTC, date, datetime
from typing import cast

import pytest
from sqlalchemy import delete, select

import sportsball.ingestion.orchestration.daily_update as daily
from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.boxscores import BoxscoreIngestionResult
from sportsball.ingestion.orchestration.daily_update import (
    DailyUpdateOptions,
    run_daily_update,
    schedule_anchor_dates,
)
from sportsball.ingestion.orchestration.official_player_seasons import (
    OfficialPlayerSeasonBuildResult,
)
from sportsball.ingestion.orchestration.play_by_play import PlayByPlayIngestionResult
from sportsball.ingestion.orchestration.player_profile_backfill import (
    PlayerProfileBackfillResult,
)
from sportsball.ingestion.orchestration.schedules import ScheduleIngestionResult
from sportsball.ingestion.orchestration.season_stats import SeasonStatsBuildResult
from sportsball.ingestion.orchestration.standings import StandingsIngestionResult
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Game, IngestionRun, Season, Team

TEST_SEASON_ID = 20982099
TEST_GAME_ID = 2098020001
TEST_TEAM_IDS = (981, 982)
TEST_DATE = date(2099, 1, 10)


def test_schedule_anchor_dates_cover_bounded_window() -> None:
    options = DailyUpdateOptions(
        run_date=date(2026, 1, 15),
        schedule_lookback_days=3,
        schedule_lookahead_days=7,
    )

    assert schedule_anchor_dates(options) == (
        date(2026, 1, 12),
        date(2026, 1, 19),
    )


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("schedule_lookback_days", -1, "schedule_lookback_days cannot be negative"),
        ("schedule_lookahead_days", -1, "schedule_lookahead_days cannot be negative"),
        ("correction_days", -1, "correction_days cannot be negative"),
        ("max_new_profiles", 0, "max_new_profiles must be at least 1"),
    ],
)
def test_daily_options_reject_invalid_boundaries(
    field: str,
    value: int,
    message: str,
) -> None:
    values: dict[str, object] = {"run_date": TEST_DATE, field: value}
    options = DailyUpdateOptions(**values)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match=message):
        options.validate()


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)
def test_daily_update_refreshes_recent_game_and_records_parent_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _create_dimensions()
    run_id = uuid.uuid4()

    def fake_schedule(anchor: date, _client: NhlClient) -> ScheduleIngestionResult:
        return ScheduleIngestionResult(run_id, anchor, 1, None)

    def fake_boxscore(game_id: int, _client: NhlClient) -> BoxscoreIngestionResult:
        return BoxscoreIngestionResult(run_id, game_id, 10, 2)

    def fake_play_by_play(game_id: int, _client: NhlClient) -> PlayByPlayIngestionResult:
        return PlayByPlayIngestionResult(run_id, game_id, 20, 6)

    def fake_profiles(
        _client: NhlClient,
        *,
        max_players: int | None = None,
        retry_failed: bool = False,
    ) -> PlayerProfileBackfillResult:
        assert max_players == 100
        assert retry_failed
        return PlayerProfileBackfillResult(0, 0, 0, 0, ())

    def fake_standings(
        snapshot_date: date,
        _client: NhlClient,
    ) -> StandingsIngestionResult:
        return StandingsIngestionResult(run_id, snapshot_date, TEST_SEASON_ID, 32)

    def fake_season_stats(
        start_season: int,
        end_season: int,
    ) -> SeasonStatsBuildResult:
        assert (start_season, end_season) == (TEST_SEASON_ID, TEST_SEASON_ID)
        return SeasonStatsBuildResult(run_id, start_season, end_season, 10, 2, 2)

    def fake_official_seasons(
        start_season: int,
        end_season: int,
    ) -> OfficialPlayerSeasonBuildResult:
        return OfficialPlayerSeasonBuildResult(run_id, start_season, end_season, 10, 2)

    monkeypatch.setattr(daily, "ingest_schedule_date", fake_schedule)
    monkeypatch.setattr(daily, "ingest_boxscore", fake_boxscore)
    monkeypatch.setattr(daily, "ingest_play_by_play", fake_play_by_play)
    monkeypatch.setattr(daily, "backfill_player_profiles", fake_profiles)
    monkeypatch.setattr(daily, "ingest_standings", fake_standings)
    monkeypatch.setattr(daily, "build_season_stats", fake_season_stats)
    monkeypatch.setattr(daily, "build_official_player_seasons", fake_official_seasons)

    try:
        result = run_daily_update(
            DailyUpdateOptions(
                run_date=TEST_DATE,
                season_id=TEST_SEASON_ID,
                include_moneypuck=False,
            ),
            cast(NhlClient, object()),
            None,
        )

        assert result.games_refreshed == 1
        assert result.records_processed == 100
        with session_scope() as session:
            parent = session.get(IngestionRun, result.run_id)
            assert parent is not None
            assert parent.status == "succeeded"
            assert parent.records_processed == 100
            assert parent.finished_at is not None
    finally:
        _clean_up()


def _create_dimensions() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2098, end_year=2099))
        away = Team(nhl_id=TEST_TEAM_IDS[0], abbreviation="DAA", name="Daily Away")
        home = Team(nhl_id=TEST_TEAM_IDS[1], abbreviation="DAH", name="Daily Home")
        session.add_all((away, home))
        session.flush()
        session.add(
            Game(
                nhl_id=TEST_GAME_ID,
                season_id=TEST_SEASON_ID,
                game_type=2,
                game_date=TEST_DATE,
                start_time_utc=datetime(2099, 1, 11, tzinfo=UTC),
                state="FINAL",
                away_team_id=away.id,
                home_team_id=home.id,
            )
        )


def _clean_up() -> None:
    with session_scope() as session:
        session.execute(
            delete(IngestionRun).where(
                IngestionRun.job_name == "daily_update",
                IngestionRun.parameters["run_date"].as_string() == TEST_DATE.isoformat(),
            )
        )
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
        assert session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID)) is None
