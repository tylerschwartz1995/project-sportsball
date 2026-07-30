"""MoneyPuck team game-level client and normalization tests."""

import hashlib

import httpx

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.normalization.moneypuck_team_games import moneypuck_team_game_frame

TEST_GAME_ID = 2099020001


def test_money_puck_client_requests_published_all_team_file() -> None:
    content = _team_games_csv()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/moneypuck/playerData/careers/gameByGame/all_teams.csv"
        return httpx.Response(200, content=content, headers={"content-type": "text/csv"})

    client = MoneyPuckClient(
        client=httpx.Client(
            base_url="https://example.test",
            transport=httpx.MockTransport(handler),
        ),
        request_interval_seconds=0,
    )
    fetched = client.fetch_all_team_games()

    assert fetched.source_key == "all:team_games"
    assert fetched.checksum == hashlib.sha256(content).hexdigest()


def test_team_game_frame_reconciles_two_teams_and_five_situations() -> None:
    normalized = moneypuck_team_game_frame(_team_games_csv(), [20992100])

    assert normalized.height == 10
    assert normalized["source_game_id"].n_unique() == 1
    alpha = normalized.filter(
        (normalized["canonical_team_abbrev"] == "TSA") & (normalized["situation"] == "all")
    ).row(0, named=True)
    beta = normalized.filter(
        (normalized["canonical_team_abbrev"] == "TSB") & (normalized["situation"] == "all")
    ).row(0, named=True)
    assert alpha["x_goals_for"] == beta["x_goals_against"]
    assert alpha["is_home"] is True
    assert beta["is_home"] is False


def _team_games_csv() -> bytes:
    header = (
        "team,season,name,gameId,playerTeam,opposingTeam,home_or_away,gameDate,"
        "position,situation,xGoalsPercentage,corsiPercentage,fenwickPercentage,"
        "iceTime,xGoalsFor,xGoalsAgainst,flurryAdjustedxGoalsFor,"
        "flurryAdjustedxGoalsAgainst,scoreVenueAdjustedxGoalsFor,"
        "scoreVenueAdjustedxGoalsAgainst,shotsOnGoalFor,shotsOnGoalAgainst,"
        "shotAttemptsFor,shotAttemptsAgainst,goalsFor,goalsAgainst,"
        "lowDangerxGoalsFor,lowDangerxGoalsAgainst,mediumDangerxGoalsFor,"
        "mediumDangerxGoalsAgainst,highDangerxGoalsFor,highDangerxGoalsAgainst,"
        "totalShotCreditFor,totalShotCreditAgainst,playoffGame"
    )
    rows = []
    for situation in ("all", "5on5", "5on4", "4on5", "other"):
        rows.extend(
            [
                (
                    f"TSA,2099,TSA,{TEST_GAME_ID},TSA,TSB,HOME,20991001,"
                    f"Team Level,{situation},0.55,0.54,0.53,3600,3.5,2.5,"
                    "3.3,2.3,3.6,2.6,30,25,60,50,4,2,0.5,0.4,1.0,0.8,"
                    "2.0,1.3,3.7,2.7,0"
                ),
                (
                    f"TSB,2099,TSB,{TEST_GAME_ID},TSB,TSA,AWAY,20991001,"
                    f"Team Level,{situation},0.45,0.46,0.47,3600,2.5,3.5,"
                    "2.3,3.3,2.6,3.6,25,30,50,60,2,4,0.4,0.5,0.8,1.0,"
                    "1.3,2.0,2.7,3.7,0"
                ),
            ]
        )
    body = "\n".join(rows)
    return f"{header}\n{body}\n".encode()
