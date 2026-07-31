"""Persistence for NHL all-time season summaries."""

from collections.abc import Sequence
from typing import Any

import polars as pl
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import (
    HistoricalGoalieSeasonStats,
    HistoricalSkaterSeasonStats,
    HistoricalTeamSeasonStats,
    Player,
    Season,
)

INSERT_BATCH_SIZE = 1_000


class HistoricalSeasonRepository:
    """Replace a bounded range of NHL-published all-time summaries."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(
        self,
        season_ids: Sequence[int],
        *,
        skaters: pl.DataFrame,
        goalies: pl.DataFrame,
        teams: pl.DataFrame,
    ) -> tuple[int, int, int]:
        """Upsert dimensions and replace only the requested seasons."""
        self._upsert_seasons(season_ids)
        self._upsert_players(skaters, goalies)
        for model in (
            HistoricalSkaterSeasonStats,
            HistoricalGoalieSeasonStats,
            HistoricalTeamSeasonStats,
        ):
            self._session.execute(delete(model).where(model.season_id.in_(season_ids)))

        skater_rows = self._resolve_players(skaters)
        goalie_rows = self._resolve_players(goalies)
        team_rows = teams.to_dicts()
        self._insert_batches(HistoricalSkaterSeasonStats, skater_rows)
        self._insert_batches(HistoricalGoalieSeasonStats, goalie_rows)
        self._insert_batches(HistoricalTeamSeasonStats, team_rows)
        return len(skater_rows), len(goalie_rows), len(team_rows)

    def _upsert_seasons(self, season_ids: Sequence[int]) -> None:
        rows = [
            {
                "id": season_id,
                "start_year": season_id // 10_000,
                "end_year": season_id % 10_000,
            }
            for season_id in season_ids
        ]
        season_insert = insert(Season)
        self._session.execute(
            season_insert.values(rows).on_conflict_do_update(
                index_elements=[Season.id],
                set_={
                    "start_year": season_insert.excluded.start_year,
                    "end_year": season_insert.excluded.end_year,
                },
            )
        )

    def _upsert_players(self, skaters: pl.DataFrame, goalies: pl.DataFrame) -> None:
        players: dict[int, dict[str, object]] = {}
        for row in skaters.select(
            "source_player_id",
            "player_name",
            "position",
        ).to_dicts():
            players[int(row["source_player_id"])] = {
                "nhl_id": int(row["source_player_id"]),
                "display_name": str(row["player_name"]),
                "position": row["position"],
            }
        for row in goalies.select(
            "source_player_id",
            "player_name",
            "position",
        ).to_dicts():
            players[int(row["source_player_id"])] = {
                "nhl_id": int(row["source_player_id"]),
                "display_name": str(row["player_name"]),
                "position": "G",
            }
        if not players:
            return
        player_insert = insert(Player)
        self._session.execute(
            player_insert.values(list(players.values())).on_conflict_do_update(
                index_elements=[Player.nhl_id],
                set_={
                    "display_name": player_insert.excluded.display_name,
                    "position": func.coalesce(Player.position, player_insert.excluded.position),
                },
            )
        )

    def _resolve_players(self, frame: pl.DataFrame) -> list[dict[str, Any]]:
        rows = frame.to_dicts()
        source_ids = {int(row["source_player_id"]) for row in rows}
        player_ids = {
            nhl_id: player_id
            for nhl_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_ids))
            ).tuples()
        }
        missing = source_ids - player_ids.keys()
        if missing:
            raise ValueError(f"historical rows missing players: {sorted(missing)[:10]}")
        resolved: list[dict[str, Any]] = []
        for source_row in rows:
            row = dict(source_row)
            source_player_id = int(row.pop("source_player_id"))
            row.pop("player_name")
            row.pop("position")
            resolved.append({**row, "player_id": player_ids[source_player_id]})
        return resolved

    def _insert_batches(self, model: type[Any], rows: list[dict[str, Any]]) -> None:
        for offset in range(0, len(rows), INSERT_BATCH_SIZE):
            self._session.execute(insert(model).values(rows[offset : offset + INSERT_BATCH_SIZE]))
