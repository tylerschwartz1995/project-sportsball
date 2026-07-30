"""Persistence for MoneyPuck line and pairing game metrics."""

from typing import Any

import polars as pl
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import (
    Game,
    MoneyPuckLineGameStats,
    Player,
    TeamSeason,
)

INSERT_BATCH_SIZE = 1_000


class MoneyPuckLineRepository:
    """Resolve canonical identities and replace one line-game season."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, season_id: int, frame: pl.DataFrame) -> int:
        """Replace all line and pairing facts for one season."""
        rows = frame.to_dicts()
        source_game_ids = {int(row["source_game_id"]) for row in rows}
        games = {
            nhl_id: (game_id, game_date, game_type, home_team_id, away_team_id)
            for nhl_id, game_id, game_date, game_type, home_team_id, away_team_id in (
                self._session.execute(
                    select(
                        Game.nhl_id,
                        Game.id,
                        Game.game_date,
                        Game.game_type,
                        Game.home_team_id,
                        Game.away_team_id,
                    ).where(
                        Game.season_id == season_id,
                        Game.nhl_id.in_(source_game_ids),
                    )
                ).tuples()
            )
        }
        missing_games = source_game_ids - games.keys()
        if missing_games:
            raise ValueError(f"MoneyPuck lines missing games: {sorted(missing_games)}")

        source_player_ids = {
            int(value)
            for row in rows
            for key in ("source_player_1_id", "source_player_2_id", "source_player_3_id")
            if (value := row[key]) is not None
        }
        player_ids = {
            nhl_id: player_id
            for nhl_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_player_ids))
            ).tuples()
        }
        missing_players = source_player_ids - player_ids.keys()
        if missing_players:
            raise ValueError(f"MoneyPuck lines missing players: {sorted(missing_players)}")

        abbreviations = {
            str(row[key])
            for row in rows
            for key in ("canonical_team_abbrev", "canonical_opponent_abbrev")
        }
        team_ids = {
            abbreviation: team_id
            for abbreviation, team_id in self._session.execute(
                select(TeamSeason.abbreviation, TeamSeason.team_id).where(
                    TeamSeason.season_id == season_id,
                    TeamSeason.abbreviation.in_(abbreviations),
                )
            ).tuples()
        }
        missing_teams = abbreviations - team_ids.keys()
        if missing_teams:
            raise ValueError(f"MoneyPuck lines missing teams: {sorted(missing_teams)}")

        resolved: list[dict[str, Any]] = []
        for row in rows:
            source_game_id = int(row.pop("source_game_id"))
            source_player_1_id = int(row.pop("source_player_1_id"))
            source_player_2_id = int(row.pop("source_player_2_id"))
            source_player_3_value = row.pop("source_player_3_id")
            team_abbrev = str(row.pop("canonical_team_abbrev"))
            opponent_abbrev = str(row.pop("canonical_opponent_abbrev"))
            game_id, canonical_date, game_type, home_team_id, away_team_id = games[source_game_id]
            team_id = team_ids[team_abbrev]
            opponent_team_id = team_ids[opponent_abbrev]
            if (
                canonical_date != row["game_date"]
                or game_type != 2
                or {team_id, opponent_team_id} != {home_team_id, away_team_id}
            ):
                raise ValueError(f"MoneyPuck line game {source_game_id} does not match NHL")
            resolved.append(
                {
                    **row,
                    "game_id": game_id,
                    "team_id": team_id,
                    "opponent_team_id": opponent_team_id,
                    "player_1_id": player_ids[source_player_1_id],
                    "player_2_id": player_ids[source_player_2_id],
                    "player_3_id": (
                        player_ids[int(source_player_3_value)]
                        if source_player_3_value is not None
                        else None
                    ),
                }
            )
        game_ids = select(Game.id).where(Game.season_id == season_id)
        self._session.execute(
            delete(MoneyPuckLineGameStats).where(MoneyPuckLineGameStats.game_id.in_(game_ids))
        )
        for offset in range(0, len(resolved), INSERT_BATCH_SIZE):
            self._session.execute(
                insert(MoneyPuckLineGameStats).values(resolved[offset : offset + INSERT_BATCH_SIZE])
            )
        return len(resolved)
