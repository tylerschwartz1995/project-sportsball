"""Client for files explicitly published on MoneyPuck's download page."""

import hashlib
import time
from dataclasses import dataclass
from types import TracebackType
from typing import Self

import httpx

DEFAULT_BASE_URL = "https://www.moneypuck.com"
DEFAULT_USER_AGENT = "sportsball/0.1 (+https://github.com/tylerschwartz1995/project-sportsball)"
TRANSIENT_STATUS_CODES = {408, 429, 500, 502, 503, 504}
SEASON_RESOURCE_TYPES = {"skaters", "goalies", "teams"}
PLAYER_GAME_RESOURCE_TYPES = {"skaters", "goalies"}
PLAYER_GAME_ARCHIVE_BASE_URL = "https://peter-tanner.com/moneypuck/downloads/seasonPlayersSummary"
DOWNLOAD_BASE_URL = "https://peter-tanner.com/moneypuck/downloads"


@dataclass(frozen=True)
class MoneyPuckCsvFetch:
    """One downloaded MoneyPuck artifact with provenance and checksum."""

    resource_type: str
    source_key: str
    source_url: str
    content_type: str | None
    content: bytes
    checksum: str


class MoneyPuckClient:
    """Fetch only the approved CSV downloads listed by MoneyPuck."""

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
            headers={"Accept": "text/csv", "User-Agent": DEFAULT_USER_AGENT},
            timeout=httpx.Timeout(60),
        )
        self._request_interval_seconds = request_interval_seconds
        self._max_retries = max_retries
        self._retry_backoff_seconds = retry_backoff_seconds
        self._last_request_at: float | None = None

    def fetch_season_summary(
        self,
        season_start_year: int,
        resource_type: str,
    ) -> MoneyPuckCsvFetch:
        """Download one regular-season summary CSV from the approved path."""
        if resource_type not in SEASON_RESOURCE_TYPES:
            raise ValueError(f"unsupported MoneyPuck season resource: {resource_type}")
        path = (
            f"/moneypuck/playerData/seasonSummary/{season_start_year}/regular/{resource_type}.csv"
        )
        response = self._get(path)
        content = response.content
        if not content.startswith(_expected_header(resource_type)):
            raise ValueError(
                f"MoneyPuck {resource_type} response does not have the expected CSV header"
            )
        return MoneyPuckCsvFetch(
            resource_type=resource_type,
            source_key=f"{season_start_year}:regular:{resource_type}",
            source_url=str(response.url),
            content_type=response.headers.get("content-type"),
            content=content,
            checksum=hashlib.sha256(content).hexdigest(),
        )

    def fetch_all_team_games(self) -> MoneyPuckCsvFetch:
        """Download the approved all-season team game-level CSV."""
        path = "/moneypuck/playerData/careers/gameByGame/all_teams.csv"
        response = self._get(path)
        content = response.content
        if not content.startswith(b"team,season,name,gameId,"):
            raise ValueError("MoneyPuck team-game response does not have the expected CSV header")
        return MoneyPuckCsvFetch(
            resource_type="team_games",
            source_key="all:team_games",
            source_url=str(response.url),
            content_type=response.headers.get("content-type"),
            content=content,
            checksum=hashlib.sha256(content).hexdigest(),
        )

    def fetch_player_game_archive(
        self,
        season_start_year: int,
        resource_type: str,
    ) -> MoneyPuckCsvFetch:
        """Download one approved regular-season player game archive."""
        if resource_type not in PLAYER_GAME_RESOURCE_TYPES:
            raise ValueError(f"unsupported MoneyPuck player-game resource: {resource_type}")
        url = f"{PLAYER_GAME_ARCHIVE_BASE_URL}/{resource_type}/{season_start_year}.zip"
        response = self._get(url)
        content = response.content
        if not content.startswith(b"PK"):
            raise ValueError(f"MoneyPuck {resource_type} player-game response is not a ZIP archive")
        return MoneyPuckCsvFetch(
            resource_type=f"{resource_type}_games",
            source_key=f"{season_start_year}:regular:{resource_type}_games",
            source_url=str(response.url),
            content_type=response.headers.get("content-type"),
            content=content,
            checksum=hashlib.sha256(content).hexdigest(),
        )

    def fetch_shot_archive(self, season_start_year: int) -> MoneyPuckCsvFetch:
        """Download one approved season-level shot archive."""
        response = self._get(f"{DOWNLOAD_BASE_URL}/shots_{season_start_year}.zip")
        content = response.content
        if not content.startswith(b"PK"):
            raise ValueError("MoneyPuck shot response is not a ZIP archive")
        return MoneyPuckCsvFetch(
            resource_type="shots",
            source_key=f"{season_start_year}:shots",
            source_url=str(response.url),
            content_type=response.headers.get("content-type"),
            content=content,
            checksum=hashlib.sha256(content).hexdigest(),
        )

    def _get(self, path: str) -> httpx.Response:
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
        raise RuntimeError("MoneyPuck request retry loop exited unexpectedly")

    def _throttle(self) -> None:
        now = time.monotonic()
        if self._last_request_at is not None:
            remaining = self._request_interval_seconds - (now - self._last_request_at)
            if remaining > 0:
                time.sleep(remaining)
        self._last_request_at = time.monotonic()

    def close(self) -> None:
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


def _expected_header(resource_type: str) -> bytes:
    return b"team,season," if resource_type == "teams" else b"playerId,season,"
