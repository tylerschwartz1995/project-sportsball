"""Transactional replacement of MoneyPuck season unit aggregates."""

from collections.abc import Sequence
from typing import Any

import polars as pl
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import MoneyPuckUnitSeasonStats

INSERT_BATCH_SIZE = 1_000


class MoneyPuckUnitSeasonRepository:
    """Replace derived unit rows for a bounded season set."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, season_ids: Sequence[int], frame: pl.DataFrame) -> int:
        """Delete stale aggregates and insert the new Polars snapshot."""
        self._session.execute(
            delete(MoneyPuckUnitSeasonStats).where(
                MoneyPuckUnitSeasonStats.season_id.in_(season_ids)
            )
        )
        rows: list[dict[str, Any]] = frame.to_dicts()
        for offset in range(0, len(rows), INSERT_BATCH_SIZE):
            self._session.execute(
                insert(MoneyPuckUnitSeasonStats).values(
                    rows[offset : offset + INSERT_BATCH_SIZE]
                )
            )
        return len(rows)
