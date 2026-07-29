"""NHL team identities and their stable franchise lineage.

The game feeds identify a historical brand with ``team.id`` while the NHL
Stats API's ``franchiseId`` connects relocations and renames. Keeping both
prevents a current name from overwriting the name shown for an older season.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TeamIdentity:
    """One NHL source team identity."""

    franchise_id: int
    abbreviation: str
    place_name: str
    common_name: str

    @property
    def full_name(self) -> str:
        """Return the identity's conventional display name."""
        return f"{self.place_name} {self.common_name}"


TEAM_IDENTITIES: dict[int, TeamIdentity] = {
    1: TeamIdentity(23, "NJD", "New Jersey", "Devils"),
    2: TeamIdentity(22, "NYI", "New York", "Islanders"),
    3: TeamIdentity(10, "NYR", "New York", "Rangers"),
    4: TeamIdentity(16, "PHI", "Philadelphia", "Flyers"),
    5: TeamIdentity(17, "PIT", "Pittsburgh", "Penguins"),
    6: TeamIdentity(6, "BOS", "Boston", "Bruins"),
    7: TeamIdentity(19, "BUF", "Buffalo", "Sabres"),
    8: TeamIdentity(1, "MTL", "Montréal", "Canadiens"),
    9: TeamIdentity(30, "OTT", "Ottawa", "Senators"),
    10: TeamIdentity(5, "TOR", "Toronto", "Maple Leafs"),
    11: TeamIdentity(35, "ATL", "Atlanta", "Thrashers"),
    12: TeamIdentity(26, "CAR", "Carolina", "Hurricanes"),
    13: TeamIdentity(33, "FLA", "Florida", "Panthers"),
    14: TeamIdentity(31, "TBL", "Tampa Bay", "Lightning"),
    15: TeamIdentity(24, "WSH", "Washington", "Capitals"),
    16: TeamIdentity(11, "CHI", "Chicago", "Blackhawks"),
    17: TeamIdentity(12, "DET", "Detroit", "Red Wings"),
    18: TeamIdentity(34, "NSH", "Nashville", "Predators"),
    19: TeamIdentity(18, "STL", "St. Louis", "Blues"),
    20: TeamIdentity(21, "CGY", "Calgary", "Flames"),
    21: TeamIdentity(27, "COL", "Colorado", "Avalanche"),
    22: TeamIdentity(25, "EDM", "Edmonton", "Oilers"),
    23: TeamIdentity(20, "VAN", "Vancouver", "Canucks"),
    24: TeamIdentity(32, "ANA", "Anaheim", "Ducks"),
    25: TeamIdentity(15, "DAL", "Dallas", "Stars"),
    26: TeamIdentity(14, "LAK", "Los Angeles", "Kings"),
    27: TeamIdentity(28, "PHX", "Phoenix", "Coyotes"),
    28: TeamIdentity(29, "SJS", "San Jose", "Sharks"),
    29: TeamIdentity(36, "CBJ", "Columbus", "Blue Jackets"),
    30: TeamIdentity(37, "MIN", "Minnesota", "Wild"),
    52: TeamIdentity(35, "WPG", "Winnipeg", "Jets"),
    53: TeamIdentity(28, "ARI", "Arizona", "Coyotes"),
    54: TeamIdentity(38, "VGK", "Vegas", "Golden Knights"),
    55: TeamIdentity(39, "SEA", "Seattle", "Kraken"),
    59: TeamIdentity(40, "UTA", "Utah", "Hockey Club"),
    68: TeamIdentity(40, "UTA", "Utah", "Mammoth"),
}


def team_identity(nhl_team_id: int) -> TeamIdentity | None:
    """Return reference metadata when the NHL source identity is known."""
    return TEAM_IDENTITIES.get(nhl_team_id)


def team_season_identity(nhl_team_id: int, season_id: int) -> TeamIdentity | None:
    """Return display metadata for a season, including known feed-ID transitions."""
    if nhl_team_id == 59 and season_id >= 20252026:
        # Early 2025-26 schedules used Utah Hockey Club's ID after the Mammoth
        # name and replacement team ID had already become official.
        return TEAM_IDENTITIES[68]
    return team_identity(nhl_team_id)
