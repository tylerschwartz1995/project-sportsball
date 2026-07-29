"""Transactional replacement of Python-derived season statistics."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import polars as pl
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import (
    GoalieSeasonStats,
    SkaterSeasonStats,
    TeamSeasonStats,
)

INSERT_BATCH_SIZE = 1_000


@dataclass(frozen=True)
class SeasonStatsReplaceResult:
    """Counts written by one season-stat replacement."""

    skaters: int
    goalies: int
    teams: int

    @property
    def total(self) -> int:
        """Return all materialized rows written."""
        return self.skaters + self.goalies + self.teams


class SeasonStatsRepository:
    """Replace aggregate rows for a bounded season set in one transaction."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(
        self,
        season_ids: Sequence[int],
        *,
        skaters: pl.DataFrame,
        goalies: pl.DataFrame,
        teams: pl.DataFrame,
    ) -> SeasonStatsReplaceResult:
        """Delete stale aggregate rows and insert the newly derived snapshot."""
        for model in (SkaterSeasonStats, GoalieSeasonStats, TeamSeasonStats):
            self._session.execute(delete(model).where(model.season_id.in_(season_ids)))

        self._insert_batches(SkaterSeasonStats, skaters.to_dicts())
        self._insert_batches(GoalieSeasonStats, goalies.to_dicts())
        self._insert_batches(TeamSeasonStats, teams.to_dicts())
        return SeasonStatsReplaceResult(
            skaters=skaters.height,
            goalies=goalies.height,
            teams=teams.height,
        )

    def _insert_batches(self, model: type[Any], rows: list[dict[str, Any]]) -> None:
        for offset in range(0, len(rows), INSERT_BATCH_SIZE):
            self._session.execute(insert(model).values(rows[offset : offset + INSERT_BATCH_SIZE]))
