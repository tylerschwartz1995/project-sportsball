"""Persistence for MoneyPuck regular-season player game metrics."""

from dataclasses import dataclass
from typing import Any

import polars as pl
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import (
    Game,
    MoneyPuckGoalieGameStats,
    MoneyPuckSkaterGameStats,
    Player,
    TeamSeason,
)

INSERT_BATCH_SIZE = 1_000


@dataclass(frozen=True)
class MoneyPuckPlayerGameReplaceResult:
    """Counts written for one player-game season."""

    skaters: int
    goalies: int

    @property
    def total(self) -> int:
        return self.skaters + self.goalies


class MoneyPuckPlayerGameRepository:
    """Resolve canonical NHL identities and replace one regular season."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(
        self,
        season_id: int,
        *,
        skaters: pl.DataFrame,
        goalies: pl.DataFrame,
    ) -> MoneyPuckPlayerGameReplaceResult:
        """Replace skater and goalie facts atomically for one season."""
        game_ids = select(Game.id).where(Game.season_id == season_id)
        self._session.execute(
            delete(MoneyPuckSkaterGameStats).where(MoneyPuckSkaterGameStats.game_id.in_(game_ids))
        )
        self._session.execute(
            delete(MoneyPuckGoalieGameStats).where(MoneyPuckGoalieGameStats.game_id.in_(game_ids))
        )
        skater_rows = self._resolve(season_id, skaters)
        goalie_rows = self._resolve(season_id, goalies)
        self._insert_batches(MoneyPuckSkaterGameStats, skater_rows)
        self._insert_batches(MoneyPuckGoalieGameStats, goalie_rows)
        return MoneyPuckPlayerGameReplaceResult(
            skaters=len(skater_rows),
            goalies=len(goalie_rows),
        )

    def _resolve(
        self,
        season_id: int,
        frame: pl.DataFrame,
    ) -> list[dict[str, Any]]:
        rows = frame.to_dicts()
        source_game_ids = {int(row["source_game_id"]) for row in rows}
        games = {
            source_id: (game_id, canonical_season, game_date, game_type)
            for source_id, game_id, canonical_season, game_date, game_type in (
                self._session.execute(
                    select(
                        Game.nhl_id,
                        Game.id,
                        Game.season_id,
                        Game.game_date,
                        Game.game_type,
                    ).where(Game.nhl_id.in_(source_game_ids))
                ).tuples()
            )
        }
        missing_games = source_game_ids - games.keys()
        if missing_games:
            raise ValueError(f"MoneyPuck rows missing games: {sorted(missing_games)}")

        source_player_ids = {int(row["source_player_id"]) for row in rows}
        player_ids = {
            source_id: player_id
            for source_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_player_ids))
            ).tuples()
        }
        missing_players = source_player_ids - player_ids.keys()
        if missing_players:
            raise ValueError(f"MoneyPuck rows missing players: {sorted(missing_players)}")

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
            raise ValueError(f"MoneyPuck rows missing teams: {sorted(missing_teams)}")

        resolved = []
        for row in rows:
            source_game_id = int(row.pop("source_game_id"))
            source_player_id = int(row.pop("source_player_id"))
            team_abbrev = str(row.pop("canonical_team_abbrev"))
            opponent_abbrev = str(row.pop("canonical_opponent_abbrev"))
            game_id, canonical_season, canonical_date, game_type = games[source_game_id]
            if (
                canonical_season != season_id
                or canonical_date != row["game_date"]
                or game_type != 2
            ):
                raise ValueError(
                    f"MoneyPuck game {source_game_id} season/date/type does not match NHL"
                )
            resolved.append(
                {
                    **row,
                    "game_id": game_id,
                    "player_id": player_ids[source_player_id],
                    "team_id": team_ids[team_abbrev],
                    "opponent_team_id": team_ids[opponent_abbrev],
                }
            )
        return resolved

    def _insert_batches(self, model: type[Any], rows: list[dict[str, Any]]) -> None:
        for offset in range(0, len(rows), INSERT_BATCH_SIZE):
            self._session.execute(insert(model).values(rows[offset : offset + INSERT_BATCH_SIZE]))
