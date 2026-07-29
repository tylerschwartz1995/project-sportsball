"""MoneyPuck season-summary client and normalization tests."""

import hashlib

import httpx

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.normalization.moneypuck_seasons import moneypuck_season_frames

TEST_SEASON_ID = 20992100
TEST_START_YEAR = 2099
TEST_SKATER_ID = 970001
TEST_GOALIE_ID = 970002


def test_money_puck_client_requests_only_published_season_path() -> None:
    csvs = _season_csvs()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.startswith("/moneypuck/playerData/seasonSummary/2099/regular/")
        resource_type = request.url.path.rsplit("/", maxsplit=1)[-1].removesuffix(".csv")
        return httpx.Response(
            200,
            content=csvs[resource_type],
            headers={"content-type": "text/csv"},
        )

    client = MoneyPuckClient(
        client=httpx.Client(
            base_url="https://example.test",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
    )
    fetched = client.fetch_season_summary(TEST_START_YEAR, "skaters")

    assert fetched.source_key == "2099:regular:skaters"
    assert fetched.checksum == hashlib.sha256(csvs["skaters"]).hexdigest()


def test_money_puck_frames_preserve_situations_and_core_metrics() -> None:
    csvs = _season_csvs()
    normalized = moneypuck_season_frames(
        TEST_SEASON_ID,
        skaters_csv=csvs["skaters"],
        goalies_csv=csvs["goalies"],
        teams_csv=csvs["teams"],
    )

    assert normalized.skaters.height == 5
    assert normalized.goalies.height == 5
    assert normalized.teams.height == 5
    skater = normalized.skaters.filter(normalized.skaters["situation"] == "all").row(
        0,
        named=True,
    )
    goalie = normalized.goalies.filter(normalized.goalies["situation"] == "all").row(
        0,
        named=True,
    )
    team = normalized.teams.filter(normalized.teams["situation"] == "all").row(
        0,
        named=True,
    )
    assert skater["individual_x_goals"] == 12.5
    assert skater["metrics"]["I_F_xGoals"] == 12.5
    assert goalie["expected_goals_against"] == 100.5
    assert team["x_goals_percentage"] == 0.55


def _season_csvs() -> dict[str, bytes]:
    situations = ("all", "5on5", "5on4", "4on5", "other")
    skater_header = (
        "playerId,season,name,team,position,situation,games_played,icetime,shifts,"
        "gameScore,onIce_xGoalsPercentage,offIce_xGoalsPercentage,"
        "onIce_corsiPercentage,offIce_corsiPercentage,onIce_fenwickPercentage,"
        "offIce_fenwickPercentage,I_F_xGoals,I_F_goals,I_F_points,"
        "I_F_shotAttempts,OnIce_F_xGoals,OnIce_A_xGoals,OnIce_F_goals,"
        "OnIce_A_goals"
    )
    goalie_header = (
        "playerId,season,name,team,position,situation,games_played,icetime,xGoals,"
        "goals,unblocked_shot_attempts,xRebounds,rebounds,xFreeze,freeze,xOnGoal,"
        "ongoal,flurryAdjustedxGoals"
    )
    team_header = (
        "team,season,name,teamAgain,position,situation,games_played,"
        "xGoalsPercentage,corsiPercentage,fenwickPercentage,iceTime,xGoalsFor,"
        "xGoalsAgainst,goalsFor,goalsAgainst,shotAttemptsFor,shotAttemptsAgainst"
    )
    skater_rows = [
        (
            f"{TEST_SKATER_ID},{TEST_START_YEAR},Test Skater,TSA,C,{situation},"
            "82,5000,1000,50,0.55,0.50,0.54,0.49,0.53,0.48,12.5,20,50,200,"
            "60.5,55.5,200,180"
        )
        for situation in situations
    ]
    goalie_rows = [
        (
            f"{TEST_GOALIE_ID},{TEST_START_YEAR},Test Goalie,TSA,G,{situation},"
            "60,3600,100.5,90,1200,50,45,100,95,1100,1080,98.5"
        )
        for situation in situations
    ]
    team_rows = [
        (
            f"TSA,{TEST_START_YEAR},TSA,TSA,Team Level,{situation},82,"
            "0.55,0.54,0.53,5000,220.5,200.5,250,230,4000,3800"
        )
        for situation in situations
    ]
    return {
        "skaters": _csv_bytes(skater_header, skater_rows),
        "goalies": _csv_bytes(goalie_header, goalie_rows),
        "teams": _csv_bytes(team_header, team_rows),
    }


def _csv_bytes(header: str, rows: list[str]) -> bytes:
    return f"{header}\n{'\n'.join(rows)}\n".encode()
