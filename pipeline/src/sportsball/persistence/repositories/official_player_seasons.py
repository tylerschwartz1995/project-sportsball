"""Persistence for NHL-published player season team splits."""

from collections.abc import Sequence
from typing import Any

import polars as pl
from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import (
    OfficialGoalieSeasonStats,
    OfficialSkaterSeasonStats,
    Player,
    TeamSeason,
)

INSERT_BATCH_SIZE = 1_000


class OfficialPlayerSeasonRepository:
    """Replace bounded seasons of official player team splits."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(
        self,
        season_ids: Sequence[int],
        *,
        skaters: pl.DataFrame,
        goalies: pl.DataFrame,
    ) -> tuple[int, int]:
        """Resolve canonical identities and replace the requested seasons."""
        for model in (OfficialSkaterSeasonStats, OfficialGoalieSeasonStats):
            self._session.execute(delete(model).where(model.season_id.in_(season_ids)))
        skater_rows = self._resolve(skaters)
        goalie_rows = self._resolve(goalies)
        self._insert_batches(OfficialSkaterSeasonStats, skater_rows)
        self._insert_batches(OfficialGoalieSeasonStats, goalie_rows)
        return len(skater_rows), len(goalie_rows)

    def _resolve(self, frame: pl.DataFrame) -> list[dict[str, Any]]:
        rows = frame.to_dicts()
        source_player_ids = {int(row["source_player_id"]) for row in rows}
        player_ids = {
            source_id: player_id
            for source_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_player_ids))
            ).tuples()
        }
        team_keys = {(int(row["season_id"]), str(row["source_team_name"])) for row in rows}
        team_ids = {
            (season_id, full_name): team_id
            for season_id, full_name, team_id in self._session.execute(
                select(TeamSeason.season_id, TeamSeason.full_name, TeamSeason.team_id).where(
                    tuple_(TeamSeason.season_id, TeamSeason.full_name).in_(team_keys)
                )
            ).tuples()
        }
        missing_players = source_player_ids - player_ids.keys()
        missing_teams = team_keys - team_ids.keys()
        if missing_players:
            raise ValueError(f"official season rows missing players: {sorted(missing_players)}")
        if missing_teams:
            raise ValueError(f"official season rows missing teams: {sorted(missing_teams)}")

        resolved = []
        for row in rows:
            source_player_id = int(row.pop("source_player_id"))
            source_team_name = str(row.pop("source_team_name"))
            resolved.append(
                {
                    **row,
                    "player_id": player_ids[source_player_id],
                    "team_id": team_ids[(int(row["season_id"]), source_team_name)],
                }
            )
        return resolved

    def _insert_batches(self, model: type[Any], rows: list[dict[str, Any]]) -> None:
        for offset in range(0, len(rows), INSERT_BATCH_SIZE):
            self._session.execute(insert(model).values(rows[offset : offset + INSERT_BATCH_SIZE]))
