"""Rate-conscious client for the official NHL Records service."""

import hashlib
import json
import time
from dataclasses import dataclass
from types import TracebackType
from typing import Any, Self

import httpx

from sportsball.clients.nhl.client import DEFAULT_USER_AGENT, TRANSIENT_STATUS_CODES
from sportsball.clients.nhl.records_schemas import DraftSelectionRow

DEFAULT_RECORDS_BASE_URL = "https://records.nhl.com/site/api"


@dataclass(frozen=True)
class DraftFetch:
    """Validated selections for one draft with the retained source response."""

    rows: tuple[DraftSelectionRow, ...]
    payload: dict[str, Any]
    checksum: str


class NhlRecordsClient:
    """Fetch complete, bounded draft boards from NHL Records."""

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_RECORDS_BASE_URL,
        client: httpx.Client | None = None,
        request_interval_seconds: float = 0.1,
        max_retries: int = 3,
        retry_backoff_seconds: float = 0.5,
        page_size: int = 500,
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
        if page_size < 1:
            raise ValueError("NHL Records page size must be positive")
        self._page_size = page_size
        self._last_request_at: float | None = None

    def fetch_draft(self, draft_year: int) -> DraftFetch:
        """Fetch every official selection for one draft year."""
        rows: list[Any] = []
        start = 0
        total: int | None = None
        while total is None or len(rows) < total:
            response = self._get(
                "/draft",
                params={
                    "cayenneExp": f"draftYear={draft_year}",
                    "sort": json.dumps(
                        [
                            {
                                "property": "overallPickNumber",
                                "direction": "ASC",
                            }
                        ],
                        separators=(",", ":"),
                    ),
                    "start": start,
                    "limit": self._page_size,
                },
            )
            page: dict[str, Any] = response.json()
            data = page.get("data")
            page_total = page.get("total")
            if not isinstance(data, list) or not isinstance(page_total, int):
                raise ValueError("NHL Records response must contain list data and integer total")
            if total is not None and total != page_total:
                raise ValueError("NHL Records total changed during pagination")
            total = page_total
            if not data and len(rows) < total:
                raise ValueError(
                    f"NHL Records pagination stopped after {len(rows)} of {total} rows"
                )
            rows.extend(data)
            start = len(rows)

        if len(rows) != total:
            raise ValueError(f"NHL Records returned {len(rows)} of {total} rows")
        payload: dict[str, Any] = {"data": rows, "total": total}
        content = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
        selections = tuple(DraftSelectionRow.model_validate(row) for row in rows)
        if any(row.draft_year != draft_year for row in selections):
            raise ValueError(f"NHL Records mixed draft years in {draft_year} response")
        return DraftFetch(
            rows=selections,
            payload=payload,
            checksum=hashlib.sha256(content).hexdigest(),
        )

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
        raise RuntimeError("NHL Records request retry loop exited unexpectedly")

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
