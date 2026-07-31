"""Rate-conscious client for NHL Stats REST season summaries."""

import hashlib
import json
import time
from dataclasses import dataclass
from types import TracebackType
from typing import Any, Self, TypeVar

import httpx
from pydantic import BaseModel

from sportsball.clients.nhl.client import DEFAULT_USER_AGENT, TRANSIENT_STATUS_CODES
from sportsball.clients.nhl.stats_schemas import (
    GoalieSeasonSummary,
    SkaterSeasonSummary,
    TeamSeasonSummary,
)

DEFAULT_STATS_BASE_URL = "https://api.nhle.com/stats/rest/en"
RowT = TypeVar("RowT", bound=BaseModel)


@dataclass(frozen=True)
class StatsReportFetch[RowT: BaseModel]:
    """Validated report rows with their original source response."""

    rows: tuple[RowT, ...]
    payload: dict[str, Any]
    checksum: str


class NhlStatsClient:
    """Fetch bounded all-time summaries from the NHL Stats REST service."""

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_STATS_BASE_URL,
        client: httpx.Client | None = None,
        request_interval_seconds: float = 0.1,
        max_retries: int = 3,
        retry_backoff_seconds: float = 0.5,
    ) -> None:
        self._owns_client = client is None
        self._client = client or httpx.Client(
            base_url=base_url,
            headers={"Accept": "application/json", "User-Agent": DEFAULT_USER_AGENT},
            timeout=httpx.Timeout(30),
        )
        self._request_interval_seconds = request_interval_seconds
        self._max_retries = max_retries
        self._retry_backoff_seconds = retry_backoff_seconds
        self._last_request_at: float | None = None

    def fetch_skaters(
        self,
        season_id: int,
        game_type: int,
    ) -> StatsReportFetch[SkaterSeasonSummary]:
        """Fetch one season and game type of skater totals."""
        return self._fetch(
            "/skater/summary",
            SkaterSeasonSummary,
            season_id,
            game_type,
            sort_property="playerId",
        )

    def fetch_goalies(
        self,
        season_id: int,
        game_type: int,
    ) -> StatsReportFetch[GoalieSeasonSummary]:
        """Fetch one season and game type of goalie totals."""
        return self._fetch(
            "/goalie/summary",
            GoalieSeasonSummary,
            season_id,
            game_type,
            sort_property="playerId",
        )

    def fetch_teams(
        self,
        season_id: int,
        game_type: int,
    ) -> StatsReportFetch[TeamSeasonSummary]:
        """Fetch one season and game type of team totals."""
        return self._fetch(
            "/team/summary",
            TeamSeasonSummary,
            season_id,
            game_type,
            sort_property="teamId",
        )

    def _fetch(
        self,
        path: str,
        row_model: type[RowT],
        season_id: int,
        game_type: int,
        *,
        sort_property: str,
    ) -> StatsReportFetch[RowT]:
        rows: list[Any] = []
        start = 0
        total: int | None = None
        while total is None or len(rows) < total:
            response = self._get(
                path,
                params={
                    "isAggregate": "false",
                    "isGame": "false",
                    "start": start,
                    "limit": 100,
                    "sort": f"[{self._sort_json(sort_property)}]",
                    "cayenneExp": f"seasonId={season_id} and gameTypeId={game_type}",
                },
            )
            page: dict[str, Any] = response.json()
            data = page.get("data")
            page_total = page.get("total")
            if not isinstance(data, list) or not isinstance(page_total, int):
                raise ValueError("NHL Stats response must contain list data and integer total")
            if total is not None and total != page_total:
                raise ValueError("NHL Stats total changed during pagination")
            total = page_total
            if not data and len(rows) < total:
                raise ValueError(f"NHL Stats pagination stopped after {len(rows)} of {total} rows")
            rows.extend(data)
            start = len(rows)

        if len(rows) != total:
            raise ValueError(f"NHL Stats returned {len(rows)} of {total} rows")
        payload: dict[str, Any] = {"data": rows, "total": total}
        content = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
        return StatsReportFetch(
            rows=tuple(row_model.model_validate(row) for row in rows),
            payload=payload,
            checksum=hashlib.sha256(content).hexdigest(),
        )

    @staticmethod
    def _sort_json(property_name: str) -> str:
        return f'{{"property":"{property_name}","direction":"ASC"}}'

    def _get(self, path: str, *, params: dict[str, str | int]) -> httpx.Response:
        for attempt in range(self._max_retries + 1):
            self._throttle()
            try:
                response = self._client.get(path, params=params)
            except httpx.TransportError:
                if attempt == self._max_retries:
                    raise
            else:
                if response.status_code not in TRANSIENT_STATUS_CODES:
                    response.raise_for_status()
                    return response
                if attempt == self._max_retries:
                    response.raise_for_status()
            time.sleep(self._retry_backoff_seconds * (2**attempt))
        raise RuntimeError("NHL Stats request retry loop exited unexpectedly")

    def _throttle(self) -> None:
        now = time.monotonic()
        if self._last_request_at is not None:
            remaining = self._request_interval_seconds - (now - self._last_request_at)
            if remaining > 0:
                time.sleep(remaining)
        self._last_request_at = time.monotonic()

    def close(self) -> None:
        """Close an internally managed HTTP connection pool."""
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.close()
