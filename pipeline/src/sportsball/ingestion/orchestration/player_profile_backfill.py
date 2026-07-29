"""Resumable profile ingestion for all canonical players."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.client import NhlClient
from sportsball.ingestion.orchestration.player_profiles import ingest_player_profile
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import Player, PlayerProfileBackfillPlayer


@dataclass(frozen=True)
class PlayerProfileBackfillFailure:
    """One player that failed during the current invocation."""

    player_id: int
    error_message: str


@dataclass(frozen=True)
class PlayerProfileBackfillResult:
    """Progress across all canonical players after one invocation."""

    total_players: int
    completed_players: int
    failed_players: int
    attempted_this_run: int
    failures: tuple[PlayerProfileBackfillFailure, ...]

    @property
    def pending_players(self) -> int:
        """Count incomplete profiles not parked as known failures."""
        return self.total_players - self.completed_players - self.failed_players


def backfill_player_profiles(
    client: NhlClient,
    *,
    max_players: int | None = None,
    retry_failed: bool = False,
    player_ids: Sequence[int] | None = None,
    on_player_complete: Callable[[int, str], None] | None = None,
) -> PlayerProfileBackfillResult:
    """Ingest missing profiles without stopping on isolated failures."""
    if max_players is not None and max_players < 1:
        raise ValueError("max_players must be at least 1")
    _reconcile_completed_statuses()
    candidates = _candidate_players(
        max_players=max_players,
        retry_failed=retry_failed,
        player_ids=player_ids,
    )
    failures: list[PlayerProfileBackfillFailure] = []
    for player_pk, nhl_player_id in candidates:
        _mark_running(player_pk)
        try:
            ingest_player_profile(nhl_player_id, client)
        except Exception as error:
            error_message = str(error)
            _mark_failed(player_pk, error_message)
            failures.append(
                PlayerProfileBackfillFailure(
                    player_id=nhl_player_id,
                    error_message=error_message,
                )
            )
            status = "failed"
        else:
            _mark_completed(player_pk)
            status = "completed"
        if on_player_complete is not None:
            on_player_complete(nhl_player_id, status)

    total, completed, failed = _progress_counts(player_ids)
    return PlayerProfileBackfillResult(
        total_players=total,
        completed_players=completed,
        failed_players=failed,
        attempted_this_run=len(candidates),
        failures=tuple(failures),
    )


def _candidate_players(
    *,
    max_players: int | None,
    retry_failed: bool,
    player_ids: Sequence[int] | None,
) -> list[tuple[int, int]]:
    statement = (
        select(Player.id, Player.nhl_id)
        .outerjoin(
            PlayerProfileBackfillPlayer,
            PlayerProfileBackfillPlayer.player_id == Player.id,
        )
        .where(Player.profile_updated_at.is_(None))
        .order_by(Player.nhl_id)
    )
    if not retry_failed:
        statement = statement.where(
            or_(
                PlayerProfileBackfillPlayer.player_id.is_(None),
                PlayerProfileBackfillPlayer.status != "failed",
            )
        )
    if player_ids is not None:
        statement = statement.where(Player.nhl_id.in_(player_ids))
    if max_players is not None:
        statement = statement.limit(max_players)
    with session_scope() as session:
        return [(player_pk, nhl_id) for player_pk, nhl_id in session.execute(statement)]


def _mark_running(player_id: int) -> None:
    status_insert = insert(PlayerProfileBackfillPlayer)
    with session_scope() as session:
        session.execute(
            status_insert.values(
                player_id=player_id,
                status="running",
                attempt_count=1,
                error_message=None,
                completed_at=None,
            ).on_conflict_do_update(
                index_elements=[PlayerProfileBackfillPlayer.player_id],
                set_={
                    "status": "running",
                    "attempt_count": PlayerProfileBackfillPlayer.attempt_count + 1,
                    "error_message": None,
                    "completed_at": None,
                    "updated_at": func.now(),
                },
            )
        )


def _mark_completed(player_id: int) -> None:
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(PlayerProfileBackfillPlayer)
            .where(PlayerProfileBackfillPlayer.player_id == player_id)
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )


def _mark_failed(player_id: int, error_message: str) -> None:
    with session_scope() as session:
        session.execute(
            update(PlayerProfileBackfillPlayer)
            .where(PlayerProfileBackfillPlayer.player_id == player_id)
            .values(
                status="failed",
                error_message=error_message,
                completed_at=None,
                updated_at=datetime.now(UTC),
            )
        )


def _progress_counts(player_ids: Sequence[int] | None) -> tuple[int, int, int]:
    player_filter = (Player.nhl_id.in_(player_ids),) if player_ids is not None else ()
    with session_scope() as session:
        total = session.scalar(select(func.count()).select_from(Player).where(*player_filter)) or 0
        completed = (
            session.scalar(
                select(func.count())
                .select_from(Player)
                .where(*player_filter, Player.profile_updated_at.is_not(None))
            )
            or 0
        )
        failed = (
            session.scalar(
                select(func.count())
                .select_from(PlayerProfileBackfillPlayer)
                .join(Player, Player.id == PlayerProfileBackfillPlayer.player_id)
                .where(
                    PlayerProfileBackfillPlayer.status == "failed",
                    Player.profile_updated_at.is_(None),
                    *player_filter,
                )
            )
            or 0
        )
    return total, completed, failed


def _reconcile_completed_statuses() -> None:
    now = datetime.now(UTC)
    with session_scope() as session:
        session.execute(
            update(PlayerProfileBackfillPlayer)
            .where(
                PlayerProfileBackfillPlayer.player_id == Player.id,
                Player.profile_updated_at.is_not(None),
                PlayerProfileBackfillPlayer.status != "completed",
            )
            .values(
                status="completed",
                error_message=None,
                completed_at=now,
                updated_at=now,
            )
        )
