"""Tests for historically accurate NHL identity lineage."""

from sportsball.reference.team_identities import team_identity, team_season_identity


def test_relocations_and_rebrands_share_the_correct_lineage() -> None:
    atlanta = team_identity(11)
    winnipeg = team_identity(52)
    phoenix = team_identity(27)
    arizona = team_identity(53)
    hockey_club = team_identity(59)
    mammoth = team_identity(68)

    assert atlanta and winnipeg and atlanta.franchise_id == winnipeg.franchise_id == 35
    assert phoenix and arizona and phoenix.franchise_id == arizona.franchise_id == 28
    assert hockey_club and mammoth and hockey_club.franchise_id == mammoth.franchise_id == 40
    assert arizona.franchise_id != hockey_club.franchise_id


def test_utah_feed_alias_uses_the_correct_season_brand() -> None:
    historical = team_season_identity(59, 20242025)
    current = team_season_identity(59, 20252026)

    assert historical and historical.full_name == "Utah Hockey Club"
    assert current and current.full_name == "Utah Mammoth"
