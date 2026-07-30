"""Persistence for normalized MoneyPuck shots."""

from typing import Any

import polars as pl
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import Game, MoneyPuckShot, Player, TeamSeason

INSERT_BATCH_SIZE = 1_000


class MoneyPuckShotRepository:
    """Resolve canonical NHL identities and replace one shot season."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, season_id: int, frame: pl.DataFrame) -> int:
        """Replace all MoneyPuck shot facts for one season."""
        rows = frame.to_dicts()
        source_game_ids = {int(row["source_game_id"]) for row in rows}
        games = {
            nhl_id: (game_id, game_type, home_team_id, away_team_id)
            for nhl_id, game_id, game_type, home_team_id, away_team_id in (
                self._session.execute(
                    select(
                        Game.nhl_id,
                        Game.id,
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
            raise ValueError(f"MoneyPuck shots missing games: {sorted(missing_games)}")

        source_player_ids = {
            int(row[key])
            for row in rows
            for key in ("source_shooter_player_id", "source_goalie_player_id")
            if int(row[key]) != 0
        }
        player_ids = {
            nhl_id: player_id
            for nhl_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_player_ids))
            ).tuples()
        }
        missing_players = source_player_ids - player_ids.keys()
        if missing_players:
            raise ValueError(f"MoneyPuck shots missing players: {sorted(missing_players)}")

        abbreviations = {
            str(row[key])
            for row in rows
            for key in (
                "canonical_team_abbrev",
                "canonical_defending_team_abbrev",
            )
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
            raise ValueError(f"MoneyPuck shots missing teams: {sorted(missing_teams)}")

        resolved: list[dict[str, Any]] = []
        for row in rows:
            source_game_id = int(row.pop("source_game_id"))
            shooter_source_id = int(row.pop("source_shooter_player_id"))
            goalie_source_id = int(row.pop("source_goalie_player_id"))
            team_abbrev = str(row.pop("canonical_team_abbrev"))
            defending_abbrev = str(row.pop("canonical_defending_team_abbrev"))
            game_id, game_type, home_team_id, away_team_id = games[source_game_id]
            shooting_team_id = team_ids[team_abbrev]
            defending_team_id = team_ids[defending_abbrev]
            if {shooting_team_id, defending_team_id} != {
                home_team_id,
                away_team_id,
            }:
                raise ValueError(f"MoneyPuck shot {source_game_id} teams do not match NHL game")
            if bool(row["is_playoff_game"]) != (game_type == 3):
                raise ValueError(f"MoneyPuck shot {source_game_id} game type does not match NHL")
            resolved.append(
                {
                    **row,
                    "game_id": game_id,
                    "shooter_player_id": player_ids.get(shooter_source_id),
                    "goalie_player_id": player_ids.get(goalie_source_id),
                    "shooting_team_id": shooting_team_id,
                    "defending_team_id": defending_team_id,
                }
            )

        game_ids = select(Game.id).where(Game.season_id == season_id)
        self._session.execute(delete(MoneyPuckShot).where(MoneyPuckShot.game_id.in_(game_ids)))
        for offset in range(0, len(resolved), INSERT_BATCH_SIZE):
            self._session.execute(
                insert(MoneyPuckShot).values(resolved[offset : offset + INSERT_BATCH_SIZE])
            )
        return len(resolved)
