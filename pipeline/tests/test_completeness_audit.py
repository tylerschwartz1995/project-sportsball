"""Completeness-audit rule and presentation tests."""

from dataclasses import replace

from sportsball.validation.completeness import (
    SeasonAudit,
    SeasonCounts,
    Severity,
    evaluate_season,
    format_season_audit,
)


def test_complete_money_puck_season_passes() -> None:
    counts = _complete_counts()

    assert evaluate_season(counts) == ()
    assert format_season_audit(SeasonAudit(counts, ()))[0].startswith("season=20242025 status=PASS")


def test_pre_money_puck_season_does_not_require_advanced_data() -> None:
    counts = replace(
        _complete_counts(),
        season_id=20052006,
        moneypuck_skater_season_rows=0,
        moneypuck_goalie_season_rows=0,
        moneypuck_team_season_rows=0,
        moneypuck_team_game_rows=0,
        moneypuck_skater_game_rows=0,
        moneypuck_goalie_game_rows=0,
        moneypuck_shot_rows=0,
        moneypuck_line_rows=0,
        moneypuck_unit_season_rows=0,
        moneypuck_summary_status=None,
        moneypuck_player_game_status=None,
        moneypuck_shot_status=None,
        moneypuck_line_status=None,
    )

    assert evaluate_season(counts) == ()


def test_shot_only_coverage_season_requires_shots_but_not_summaries() -> None:
    counts = replace(
        _complete_counts(),
        season_id=20072008,
        moneypuck_skater_season_rows=0,
        moneypuck_goalie_season_rows=0,
        moneypuck_team_season_rows=0,
        moneypuck_team_game_rows=0,
        moneypuck_skater_game_rows=0,
        moneypuck_goalie_game_rows=0,
        moneypuck_line_rows=0,
        moneypuck_unit_season_rows=0,
        moneypuck_summary_status=None,
        moneypuck_player_game_status=None,
        moneypuck_line_status=None,
    )

    assert evaluate_season(counts) == ()

    issues = evaluate_season(replace(counts, moneypuck_shot_rows=0))
    assert [(issue.severity, issue.check) for issue in issues] == [
        (Severity.ERROR, "moneypuck_shots")
    ]


def test_missing_facts_fail_and_unresolved_event_player_warns() -> None:
    counts = replace(
        _complete_counts(),
        boxscore_games=1_399,
        play_by_play_games=1_398,
        unresolved_event_players=2,
    )

    issues = evaluate_season(counts)

    assert {issue.check for issue in issues if issue.severity is Severity.ERROR} == {
        "boxscores",
        "play_by_play",
        "derived_team_stats",
    }
    assert [issue.check for issue in issues if issue.severity is Severity.WARNING] == [
        "event_participants"
    ]


def _complete_counts() -> SeasonCounts:
    return SeasonCounts(
        season_id=20242025,
        schedule_status="completed",
        expected_games=1_400,
        stored_games=1_400,
        final_games=1_400,
        boxscore_games=1_400,
        play_by_play_games=1_400,
        team_season_rows=64,
        team_season_games=2_800,
        skater_season_rows=1_000,
        goalie_season_rows=150,
        official_standings_rows=32,
        official_skater_rows=1_100,
        official_goalie_rows=170,
        moneypuck_skater_season_rows=4_000,
        moneypuck_goalie_season_rows=700,
        moneypuck_team_season_rows=160,
        moneypuck_team_game_rows=14_000,
        moneypuck_skater_game_rows=40_000,
        moneypuck_goalie_game_rows=3_000,
        moneypuck_shot_rows=300_000,
        moneypuck_line_rows=20_000,
        moneypuck_unit_season_rows=12_000,
        moneypuck_summary_status="completed",
        moneypuck_player_game_status="completed",
        moneypuck_shot_status="completed",
        moneypuck_line_status="completed",
    )
