"""Persistence for MoneyPuck team game-level advanced metrics."""

from collections.abc import Sequence
from typing import Any

import polars as pl
from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import Game, MoneyPuckTeamGameStats, TeamSeason

INSERT_BATCH_SIZE = 1_000


class MoneyPuckTeamGameRepository:
    """Resolve canonical games/teams and replace bounded game-level rows."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, season_ids: Sequence[int], frame: pl.DataFrame) -> int:
        """Replace MoneyPuck team-game rows for the requested seasons."""
        rows = frame.to_dicts()
        source_game_ids = {int(row["source_game_id"]) for row in rows}
        games = {
            source_id: (game_id, season_id, game_date)
            for source_id, game_id, season_id, game_date in self._session.execute(
                select(Game.nhl_id, Game.id, Game.season_id, Game.game_date).where(
                    Game.nhl_id.in_(source_game_ids)
                )
            ).tuples()
        }
        missing_games = source_game_ids - games.keys()
        if missing_games:
            raise ValueError(f"MoneyPuck rows missing games: {sorted(missing_games)}")

        team_keys = {
            (int(row["season_id"]), str(row[key]))
            for row in rows
            for key in ("canonical_team_abbrev", "canonical_opponent_abbrev")
        }
        team_ids = {
            (season_id, abbreviation): team_id
            for season_id, abbreviation, team_id in self._session.execute(
                select(TeamSeason.season_id, TeamSeason.abbreviation, TeamSeason.team_id).where(
                    tuple_(TeamSeason.season_id, TeamSeason.abbreviation).in_(team_keys)
                )
            ).tuples()
        }
        missing_teams = team_keys - team_ids.keys()
        if missing_teams:
            raise ValueError(f"MoneyPuck rows missing teams: {sorted(missing_teams)}")

        resolved: list[dict[str, Any]] = []
        for row in rows:
            source_game_id = int(row.pop("source_game_id"))
            season_id = int(row.pop("season_id"))
            team_abbrev = str(row.pop("canonical_team_abbrev"))
            opponent_abbrev = str(row.pop("canonical_opponent_abbrev"))
            game_id, canonical_season, canonical_date = games[source_game_id]
            if canonical_season != season_id or canonical_date != row["game_date"]:
                raise ValueError(f"MoneyPuck game {source_game_id} season/date does not match NHL")
            resolved.append(
                {
                    **row,
                    "game_id": game_id,
                    "team_id": team_ids[(season_id, team_abbrev)],
                    "opponent_team_id": team_ids[(season_id, opponent_abbrev)],
                }
            )

        game_ids = select(Game.id).where(Game.season_id.in_(season_ids))
        self._session.execute(
            delete(MoneyPuckTeamGameStats).where(MoneyPuckTeamGameStats.game_id.in_(game_ids))
        )
        for offset in range(0, len(resolved), INSERT_BATCH_SIZE):
            self._session.execute(
                insert(MoneyPuckTeamGameStats).values(resolved[offset : offset + INSERT_BATCH_SIZE])
            )
        return len(resolved)
