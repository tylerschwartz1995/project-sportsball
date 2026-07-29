"""NHL player landing contract and normalization tests."""

import hashlib

import httpx

from sportsball.clients.nhl.client import NhlClient
from sportsball.clients.nhl.schemas import PlayerProfileResponse
from sportsball.normalization.player_profiles import normalize_player_profile


def test_active_player_profile_normalizes_identity_and_draft() -> None:
    profile = PlayerProfileResponse.model_validate(_profile_payload())

    normalized = normalize_player_profile(profile)

    assert normalized.display_name == "Test Skater"
    assert normalized.birth_city == "Vancouver"
    assert normalized.birth_state_province == "British Columbia"
    assert normalized.height_in_inches == 72
    assert normalized.source_current_team_id == 750
    assert normalized.draft_year == 2020
    assert normalized.draft_overall_pick == 15


def test_undrafted_retired_player_allows_missing_current_fields() -> None:
    payload = _profile_payload()
    payload["isActive"] = False
    payload["currentTeamId"] = None
    payload["sweaterNumber"] = None
    payload["draftDetails"] = None

    normalized = normalize_player_profile(PlayerProfileResponse.model_validate(payload))

    assert normalized.is_active is False
    assert normalized.source_current_team_id is None
    assert normalized.draft_year is None


def test_client_requests_expected_player_endpoint() -> None:
    payload = _profile_payload()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/player/950001/landing"
        return httpx.Response(200, json=payload)

    client = NhlClient(
        client=httpx.Client(
            base_url="https://example.test/v1",
            transport=httpx.MockTransport(handler),
        )
    )

    fetched = client.fetch_player_profile(950001)

    assert fetched.profile.player_id == 950001
    assert fetched.checksum == hashlib.sha256(httpx.Response(200, json=payload).content).hexdigest()


def _profile_payload() -> dict[str, object]:
    return {
        "playerId": 950001,
        "firstName": {"default": "Test"},
        "lastName": {"default": "Skater"},
        "birthDate": "2001-02-03",
        "birthCity": {"default": "Vancouver"},
        "birthStateProvince": {"default": "British Columbia"},
        "birthCountry": "CAN",
        "heightInInches": 72,
        "weightInPounds": 195,
        "shootsCatches": "L",
        "position": "C",
        "isActive": True,
        "currentTeamId": 750,
        "sweaterNumber": 19,
        "playerSlug": "test-skater-950001",
        "draftDetails": {
            "year": 2020,
            "teamAbbrev": "TST",
            "round": 1,
            "pickInRound": 15,
            "overallPick": 15,
        },
    }
