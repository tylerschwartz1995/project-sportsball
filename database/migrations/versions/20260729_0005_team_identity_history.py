"""Add franchise lineage and season-specific team identities.

Revision ID: 20260729_0005
Revises: 20260729_0004
Create Date: 2026-07-29
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0005"
down_revision: str | Sequence[str] | None = "20260729_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

FRANCHISES = [
    (1, "Montréal Canadiens"),
    (2, "Montreal Wanderers"),
    (3, "St. Louis Eagles"),
    (4, "Hamilton Tigers"),
    (5, "Toronto Maple Leafs"),
    (6, "Boston Bruins"),
    (7, "Montreal Maroons"),
    (8, "Brooklyn Americans"),
    (9, "Philadelphia Quakers"),
    (10, "New York Rangers"),
    (11, "Chicago Blackhawks"),
    (12, "Detroit Red Wings"),
    (13, "Cleveland Barons"),
    (14, "Los Angeles Kings"),
    (15, "Dallas Stars"),
    (16, "Philadelphia Flyers"),
    (17, "Pittsburgh Penguins"),
    (18, "St. Louis Blues"),
    (19, "Buffalo Sabres"),
    (20, "Vancouver Canucks"),
    (21, "Calgary Flames"),
    (22, "New York Islanders"),
    (23, "New Jersey Devils"),
    (24, "Washington Capitals"),
    (25, "Edmonton Oilers"),
    (26, "Carolina Hurricanes"),
    (27, "Colorado Avalanche"),
    (28, "Arizona Coyotes"),
    (29, "San Jose Sharks"),
    (30, "Ottawa Senators"),
    (31, "Tampa Bay Lightning"),
    (32, "Anaheim Ducks"),
    (33, "Florida Panthers"),
    (34, "Nashville Predators"),
    (35, "Winnipeg Jets"),
    (36, "Columbus Blue Jackets"),
    (37, "Minnesota Wild"),
    (38, "Vegas Golden Knights"),
    (39, "Seattle Kraken"),
    (40, "Utah Mammoth"),
]

# NHL team ID, franchise ID, abbreviation, place name, common name.
TEAM_IDENTITIES = [
    (1, 23, "NJD", "New Jersey", "Devils"),
    (2, 22, "NYI", "New York", "Islanders"),
    (3, 10, "NYR", "New York", "Rangers"),
    (4, 16, "PHI", "Philadelphia", "Flyers"),
    (5, 17, "PIT", "Pittsburgh", "Penguins"),
    (6, 6, "BOS", "Boston", "Bruins"),
    (7, 19, "BUF", "Buffalo", "Sabres"),
    (8, 1, "MTL", "Montréal", "Canadiens"),
    (9, 30, "OTT", "Ottawa", "Senators"),
    (10, 5, "TOR", "Toronto", "Maple Leafs"),
    (11, 35, "ATL", "Atlanta", "Thrashers"),
    (12, 26, "CAR", "Carolina", "Hurricanes"),
    (13, 33, "FLA", "Florida", "Panthers"),
    (14, 31, "TBL", "Tampa Bay", "Lightning"),
    (15, 24, "WSH", "Washington", "Capitals"),
    (16, 11, "CHI", "Chicago", "Blackhawks"),
    (17, 12, "DET", "Detroit", "Red Wings"),
    (18, 34, "NSH", "Nashville", "Predators"),
    (19, 18, "STL", "St. Louis", "Blues"),
    (20, 21, "CGY", "Calgary", "Flames"),
    (21, 27, "COL", "Colorado", "Avalanche"),
    (22, 25, "EDM", "Edmonton", "Oilers"),
    (23, 20, "VAN", "Vancouver", "Canucks"),
    (24, 32, "ANA", "Anaheim", "Ducks"),
    (25, 15, "DAL", "Dallas", "Stars"),
    (26, 14, "LAK", "Los Angeles", "Kings"),
    (27, 28, "PHX", "Phoenix", "Coyotes"),
    (28, 29, "SJS", "San Jose", "Sharks"),
    (29, 36, "CBJ", "Columbus", "Blue Jackets"),
    (30, 37, "MIN", "Minnesota", "Wild"),
    (52, 35, "WPG", "Winnipeg", "Jets"),
    (53, 28, "ARI", "Arizona", "Coyotes"),
    (54, 38, "VGK", "Vegas", "Golden Knights"),
    (55, 39, "SEA", "Seattle", "Kraken"),
    (59, 40, "UTA", "Utah", "Hockey Club"),
    (68, 40, "UTA", "Utah", "Mammoth"),
]


def upgrade() -> None:
    """Create and seed identity lineage while preserving existing games."""
    op.create_table(
        "franchises",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("current_name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    franchise_table = sa.table(
        "franchises",
        sa.column("id", sa.Integer()),
        sa.column("current_name", sa.String()),
    )
    op.bulk_insert(
        franchise_table,
        [
            {"id": franchise_id, "current_name": name}
            for franchise_id, name in FRANCHISES
        ],
    )

    op.add_column("teams", sa.Column("franchise_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_teams_franchise_id",
        "teams",
        "franchises",
        ["franchise_id"],
        ["id"],
    )
    op.create_index("ix_teams_franchise_id", "teams", ["franchise_id"])

    connection = op.get_bind()
    for nhl_id, franchise_id, abbreviation, _place_name, common_name in TEAM_IDENTITIES:
        connection.execute(
            sa.text(
                """
                INSERT INTO teams (nhl_id, franchise_id, abbreviation, name)
                VALUES (:nhl_id, :franchise_id, :abbreviation, :name)
                ON CONFLICT (nhl_id) DO UPDATE SET
                    franchise_id = EXCLUDED.franchise_id,
                    abbreviation = EXCLUDED.abbreviation,
                    name = EXCLUDED.name
                """
            ),
            {
                "nhl_id": nhl_id,
                "franchise_id": franchise_id,
                "abbreviation": abbreviation,
                "name": common_name,
            },
        )

    op.create_table(
        "team_seasons",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("season_id", sa.Integer(), nullable=False),
        sa.Column("abbreviation", sa.String(length=10), nullable=False),
        sa.Column("place_name", sa.String(length=100), nullable=True),
        sa.Column("common_name", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.ForeignKeyConstraint(["season_id"], ["seasons.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "season_id", name="uq_team_seasons_team_season"),
    )
    op.create_index("ix_team_seasons_season_id", "team_seasons", ["season_id"])
    op.create_index("ix_team_seasons_team_id", "team_seasons", ["team_id"])

    identity_by_nhl_id = {
        row[0]: {
            "abbreviation": row[2],
            "place_name": row[3],
            "common_name": row[4],
            "full_name": f"{row[3]} {row[4]}",
        }
        for row in TEAM_IDENTITIES
    }
    existing_team_seasons = connection.execute(
        sa.text(
            """
            SELECT DISTINCT t.id AS team_id, t.nhl_id, t.abbreviation, t.name, x.season_id
            FROM (
                SELECT away_team_id AS team_id, season_id FROM games
                UNION
                SELECT home_team_id AS team_id, season_id FROM games
            ) AS x
            JOIN teams AS t ON t.id = x.team_id
            """
        )
    ).mappings()
    team_season_rows: list[dict[str, Any]] = []
    for row in existing_team_seasons:
        identity = identity_by_nhl_id.get(row["nhl_id"])
        if row["nhl_id"] == 59 and row["season_id"] >= 20252026:
            identity = identity_by_nhl_id[68]
        team_season_rows.append(
            {
                "team_id": row["team_id"],
                "season_id": row["season_id"],
                "abbreviation": (
                    identity["abbreviation"] if identity else row["abbreviation"]
                ),
                "place_name": identity["place_name"] if identity else None,
                "common_name": identity["common_name"] if identity else row["name"],
                "full_name": identity["full_name"] if identity else row["name"],
            }
        )
    if team_season_rows:
        team_season_table = sa.table(
            "team_seasons",
            sa.column("team_id", sa.Integer()),
            sa.column("season_id", sa.Integer()),
            sa.column("abbreviation", sa.String()),
            sa.column("place_name", sa.String()),
            sa.column("common_name", sa.String()),
            sa.column("full_name", sa.String()),
        )
        op.bulk_insert(team_season_table, team_season_rows)

    op.create_table(
        "team_transitions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("from_team_id", sa.Integer(), nullable=True),
        sa.Column("to_team_id", sa.Integer(), nullable=False),
        sa.Column("effective_season_id", sa.Integer(), nullable=False),
        sa.Column("transition_type", sa.String(length=30), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=False),
        sa.ForeignKeyConstraint(["from_team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["to_team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_team_transitions_effective_season_id",
        "team_transitions",
        ["effective_season_id"],
    )
    team_ids = {
        nhl_id: team_id
        for nhl_id, team_id in connection.execute(
            sa.text("SELECT nhl_id, id FROM teams WHERE nhl_id = ANY(:nhl_ids)"),
            {"nhl_ids": [11, 27, 52, 53, 54, 55, 59, 68]},
        )
    }
    transition_table = sa.table(
        "team_transitions",
        sa.column("from_team_id", sa.Integer()),
        sa.column("to_team_id", sa.Integer()),
        sa.column("effective_season_id", sa.Integer()),
        sa.column("transition_type", sa.String()),
        sa.column("notes", sa.Text()),
        sa.column("source_url", sa.String()),
    )
    op.bulk_insert(
        transition_table,
        [
            {
                "from_team_id": team_ids[11],
                "to_team_id": team_ids[52],
                "effective_season_id": 20112012,
                "transition_type": "relocation",
                "notes": "The Atlanta Thrashers franchise relocated to Winnipeg.",
                "source_url": "https://records.nhl.com/history",
            },
            {
                "from_team_id": team_ids[27],
                "to_team_id": team_ids[53],
                "effective_season_id": 20142015,
                "transition_type": "rebrand",
                "notes": "The Phoenix Coyotes identity became the Arizona Coyotes.",
                "source_url": "https://records.nhl.com/history",
            },
            {
                "from_team_id": None,
                "to_team_id": team_ids[54],
                "effective_season_id": 20172018,
                "transition_type": "expansion",
                "notes": "Vegas joined the NHL as an expansion team.",
                "source_url": "https://records.nhl.com/history",
            },
            {
                "from_team_id": None,
                "to_team_id": team_ids[55],
                "effective_season_id": 20212022,
                "transition_type": "expansion",
                "notes": "Seattle joined the NHL as an expansion team.",
                "source_url": (
                    "https://www.nhl.com/news/"
                    "seattle-officially-joins-nhl-can-sign-free-agents-make-trades-324191506"
                ),
            },
            {
                "from_team_id": team_ids[53],
                "to_team_id": team_ids[59],
                "effective_season_id": 20242025,
                "transition_type": "asset_transfer",
                "notes": (
                    "A new Utah franchise was established using transferred Arizona "
                    "hockey assets; it is not the same franchise lineage."
                ),
                "source_url": (
                    "https://www.nhl.com/utah/news/"
                    "nhl-bog-approves-establishment-of-new-franchise-in-utah-x8485"
                ),
            },
            {
                "from_team_id": team_ids[59],
                "to_team_id": team_ids[68],
                "effective_season_id": 20252026,
                "transition_type": "rebrand",
                "notes": "Utah Hockey Club adopted the Utah Mammoth identity.",
                "source_url": (
                    "https://www.nhl.com/utah/news/"
                    "utah-s-nhl-franchise-officially-named-the-utah-mammoth-release-5-7-25"
                ),
            },
        ],
    )


def downgrade() -> None:
    """Remove identity history tables and franchise linkage."""
    op.drop_index(
        "ix_team_transitions_effective_season_id",
        table_name="team_transitions",
    )
    op.drop_table("team_transitions")
    op.drop_index("ix_team_seasons_team_id", table_name="team_seasons")
    op.drop_index("ix_team_seasons_season_id", table_name="team_seasons")
    op.drop_table("team_seasons")
    op.drop_index("ix_teams_franchise_id", table_name="teams")
    op.drop_constraint("fk_teams_franchise_id", "teams", type_="foreignkey")
    op.drop_column("teams", "franchise_id")
    op.drop_table("franchises")
