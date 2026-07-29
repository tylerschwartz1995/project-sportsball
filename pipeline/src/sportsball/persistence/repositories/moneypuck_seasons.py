"""Persistence for normalized MoneyPuck season summaries."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import polars as pl
from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import (
    MoneyPuckGoalieSeasonStats,
    MoneyPuckSkaterSeasonStats,
    MoneyPuckTeamSeasonStats,
    Player,
    TeamSeason,
)

INSERT_BATCH_SIZE = 500


@dataclass(frozen=True)
class MoneyPuckSeasonReplaceResult:
    """Counts written for one bounded MoneyPuck replacement."""

    skaters: int
    goalies: int
    teams: int

    @property
    def total(self) -> int:
        return self.skaters + self.goalies + self.teams


class MoneyPuckSeasonRepository:
    """Resolve NHL identities and replace MoneyPuck season summaries."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(
        self,
        season_ids: Sequence[int],
        *,
        skaters: pl.DataFrame,
        goalies: pl.DataFrame,
        teams: pl.DataFrame,
    ) -> MoneyPuckSeasonReplaceResult:
        """Replace all three entity tables for the requested seasons."""
        for model in (
            MoneyPuckSkaterSeasonStats,
            MoneyPuckGoalieSeasonStats,
            MoneyPuckTeamSeasonStats,
        ):
            self._session.execute(delete(model).where(model.season_id.in_(season_ids)))
        skater_rows = self._resolve(skaters, include_player=True)
        goalie_rows = self._resolve(goalies, include_player=True)
        team_rows = self._resolve(teams, include_player=False)
        self._insert_batches(MoneyPuckSkaterSeasonStats, skater_rows)
        self._insert_batches(MoneyPuckGoalieSeasonStats, goalie_rows)
        self._insert_batches(MoneyPuckTeamSeasonStats, team_rows)
        return MoneyPuckSeasonReplaceResult(
            skaters=len(skater_rows),
            goalies=len(goalie_rows),
            teams=len(team_rows),
        )

    def _resolve(
        self,
        frame: pl.DataFrame,
        *,
        include_player: bool,
    ) -> list[dict[str, Any]]:
        rows = frame.to_dicts()
        team_keys = {(int(row["season_id"]), str(row["canonical_team_abbrev"])) for row in rows}
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

        player_ids: dict[int, int] = {}
        if include_player:
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

        resolved = []
        for row in rows:
            abbreviation = str(row.pop("canonical_team_abbrev"))
            season_id = int(row["season_id"])
            values = {
                **row,
                "team_id": team_ids[(season_id, abbreviation)],
            }
            if include_player:
                source_player_id = int(values.pop("source_player_id"))
                values["player_id"] = player_ids[source_player_id]
            resolved.append(values)
        return resolved

    def _insert_batches(self, model: type[Any], rows: list[dict[str, Any]]) -> None:
        for offset in range(0, len(rows), INSERT_BATCH_SIZE):
            self._session.execute(insert(model).values(rows[offset : offset + INSERT_BATCH_SIZE]))
