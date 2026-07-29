"""Rate-conscious client for NHL web endpoints."""

from datetime import date
from types import TracebackType
from typing import Self

import httpx

from sportsball.clients.nhl.schemas import ScheduleResponse

DEFAULT_BASE_URL = "https://api-web.nhle.com/v1"
DEFAULT_USER_AGENT = "sportsball/0.1 (+https://github.com/tylerschwartz1995/project-sportsball)"


class NhlClient:
    """Fetch and validate data from NHL web endpoints."""

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        client: httpx.Client | None = None,
    ) -> None:
        self._owns_client = client is None
        self._client = client or httpx.Client(
            base_url=base_url,
            headers={
                "Accept": "application/json",
                "User-Agent": DEFAULT_USER_AGENT,
            },
            timeout=httpx.Timeout(30),
        )

    def get_schedule(self, game_date: date) -> ScheduleResponse:
        """Return the validated NHL schedule for a calendar date."""
        response = self._client.get(f"/schedule/{game_date.isoformat()}")
        response.raise_for_status()
        return ScheduleResponse.model_validate_json(response.content)

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
