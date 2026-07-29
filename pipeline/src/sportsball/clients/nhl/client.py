"""Rate-conscious client for NHL web endpoints."""

import hashlib
import time
from dataclasses import dataclass
from datetime import date
from types import TracebackType
from typing import Any, Self

import httpx

from sportsball.clients.nhl.schemas import (
    BoxscoreResponse,
    PlayByPlayResponse,
    PlayerProfileResponse,
    ScheduleResponse,
    StandingsResponse,
)

DEFAULT_BASE_URL = "https://api-web.nhle.com/v1"
DEFAULT_USER_AGENT = "sportsball/0.1 (+https://github.com/tylerschwartz1995/project-sportsball)"
TRANSIENT_STATUS_CODES = {408, 429, 500, 502, 503, 504}


@dataclass(frozen=True)
class ScheduleFetch:
    """A validated schedule together with its original source payload."""

    schedule: ScheduleResponse
    payload: dict[str, Any]
    checksum: str


@dataclass(frozen=True)
class BoxscoreFetch:
    """A validated box score together with its original source payload."""

    boxscore: BoxscoreResponse
    payload: dict[str, Any]
    checksum: str


@dataclass(frozen=True)
class PlayByPlayFetch:
    """Validated play-by-play together with its original source payload."""

    play_by_play: PlayByPlayResponse
    payload: dict[str, Any]
    checksum: str


@dataclass(frozen=True)
class PlayerProfileFetch:
    """Validated player profile together with its original source payload."""

    profile: PlayerProfileResponse
    payload: dict[str, Any]
    checksum: str


@dataclass(frozen=True)
class StandingsFetch:
    """Validated official standings together with the source payload."""

    standings: StandingsResponse
    payload: dict[str, Any]
    checksum: str


class NhlClient:
    """Fetch and validate data from NHL web endpoints."""

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        client: httpx.Client | None = None,
        request_interval_seconds: float = 0.25,
        max_retries: int = 3,
        retry_backoff_seconds: float = 0.5,
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
        self._request_interval_seconds = request_interval_seconds
        self._max_retries = max_retries
        self._retry_backoff_seconds = retry_backoff_seconds
        self._last_request_at: float | None = None

    def get_schedule(self, game_date: date) -> ScheduleResponse:
        """Return the validated NHL schedule for a calendar date."""
        return self.fetch_schedule(game_date).schedule

    def fetch_schedule(self, game_date: date) -> ScheduleFetch:
        """Return a validated schedule and the exact decoded source payload."""
        response = self._get(f"/schedule/{game_date.isoformat()}")
        payload: dict[str, Any] = response.json()
        return ScheduleFetch(
            schedule=ScheduleResponse.model_validate(payload),
            payload=payload,
            checksum=hashlib.sha256(response.content).hexdigest(),
        )

    def fetch_boxscore(self, game_id: int) -> BoxscoreFetch:
        """Return a validated game-center box score and decoded source payload."""
        response = self._get(f"/gamecenter/{game_id}/boxscore")
        payload: dict[str, Any] = response.json()
        return BoxscoreFetch(
            boxscore=BoxscoreResponse.model_validate(payload),
            payload=payload,
            checksum=hashlib.sha256(response.content).hexdigest(),
        )

    def fetch_play_by_play(self, game_id: int) -> PlayByPlayFetch:
        """Return validated game events and the decoded source payload."""
        response = self._get(f"/gamecenter/{game_id}/play-by-play")
        payload: dict[str, Any] = response.json()
        return PlayByPlayFetch(
            play_by_play=PlayByPlayResponse.model_validate(payload),
            payload=payload,
            checksum=hashlib.sha256(response.content).hexdigest(),
        )

    def fetch_player_profile(self, player_id: int) -> PlayerProfileFetch:
        """Return a validated player landing response and source payload."""
        response = self._get(f"/player/{player_id}/landing")
        payload: dict[str, Any] = response.json()
        return PlayerProfileFetch(
            profile=PlayerProfileResponse.model_validate(payload),
            payload=payload,
            checksum=hashlib.sha256(response.content).hexdigest(),
        )

    def fetch_standings(self, snapshot_date: date) -> StandingsFetch:
        """Return validated official standings for one date."""
        response = self._get(f"/standings/{snapshot_date.isoformat()}")
        payload: dict[str, Any] = response.json()
        return StandingsFetch(
            standings=StandingsResponse.model_validate(payload),
            payload=payload,
            checksum=hashlib.sha256(response.content).hexdigest(),
        )

    def _get(self, path: str) -> httpx.Response:
        """GET one NHL resource with throttling and transient retries."""
        for attempt in range(self._max_retries + 1):
            self._throttle()
            try:
                response = self._client.get(path)
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

        raise RuntimeError("NHL request retry loop exited unexpectedly")

    def _throttle(self) -> None:
        """Keep request starts separated by the configured minimum interval."""
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
