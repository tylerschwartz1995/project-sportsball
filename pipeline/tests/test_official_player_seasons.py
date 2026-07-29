"""NHL-published player season normalization tests."""

from typing import cast

from sportsball.clients.nhl.schemas import PlayerProfileResponse
from sportsball.normalization.official_player_seasons import (
    official_player_season_frames,
)


def test_official_player_seasons_split_skaters_and_goalies() -> None:
    profiles = [
        PlayerProfileResponse.model_validate(_profile_payload(960001, "C")),
        PlayerProfileResponse.model_validate(_profile_payload(960002, "G")),
    ]

    normalized = official_player_season_frames(profiles, [20992100])

    assert normalized.skaters.height == 1
    assert normalized.goalies.height == 1
    skater = normalized.skaters.row(0, named=True)
    goalie = normalized.goalies.row(0, named=True)
    assert skater["game_winning_goals"] == 3
    assert skater["power_play_points"] == 8
    assert skater["average_time_on_ice_seconds"] == 16 * 60 + 9
    assert goalie["wins"] == 20
    assert goalie["time_on_ice_seconds"] == 1234 * 60 + 56
    assert goalie["save_percentage"] == 0.915


def test_non_nhl_and_out_of_range_totals_are_excluded() -> None:
    payload = _profile_payload(960001, "C")
    season_totals = cast(list[dict[str, object]], payload["seasonTotals"])
    season_totals.extend(
        [
            {
                **season_totals[0],
                "leagueAbbrev": "AHL",
            },
            {
                **season_totals[0],
                "season": 20982099,
            },
        ]
    )

    normalized = official_player_season_frames(
        [PlayerProfileResponse.model_validate(payload)],
        [20992100],
    )

    assert normalized.skaters.height == 1


def _profile_payload(player_id: int, position: str) -> dict[str, object]:
    total = {
        "season": 20992100,
        "gameTypeId": 2,
        "leagueAbbrev": "NHL",
        "teamName": {"default": "Test Alpha"},
        "sequence": 1,
        "gamesPlayed": 50,
    }
    if position == "G":
        total.update(
            {
                "gamesStarted": 40,
                "wins": 20,
                "losses": 15,
                "ties": 0,
                "otLosses": 5,
                "goals": 0,
                "assists": 2,
                "points": 2,
                "pim": 4,
                "timeOnIce": "1234:56",
                "goalsAgainst": 100,
                "goalsAgainstAvg": 2.43,
                "shotsAgainst": 1176,
                "savePctg": 0.915,
                "shutouts": 4,
            }
        )
    else:
        total.update(
            {
                "goals": 20,
                "assists": 30,
                "points": 50,
                "pim": 12,
                "plusMinus": 8,
                "avgToi": "16:09",
                "faceoffWinningPctg": 0.52,
                "gameWinningGoals": 3,
                "otGoals": 1,
                "powerPlayGoals": 4,
                "powerPlayPoints": 8,
                "shorthandedGoals": 1,
                "shorthandedPoints": 2,
                "shots": 150,
                "shootingPctg": 0.133333,
            }
        )
    return {
        "playerId": player_id,
        "firstName": {"default": "Test"},
        "lastName": {"default": "Player"},
        "position": position,
        "seasonTotals": [total],
    }
