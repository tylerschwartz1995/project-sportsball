"""Idempotent PostgreSQL persistence for normalized NHL game events."""

from dataclasses import dataclass
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.normalization.play_by_play import NormalizedPlayByPlay
from sportsball.persistence.models import (
    Game,
    GameEvent,
    GameEventPlayer,
    Player,
    Team,
)


@dataclass(frozen=True)
class PlayByPlayReplaceResult:
    """Counts written while replacing one game's events."""

    players: int
    events: int
    participants: int


class PlayByPlayRepository:
    """Replace one game's normalized event snapshot transactionally."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def replace(self, normalized: NormalizedPlayByPlay) -> PlayByPlayReplaceResult:
        """Upsert roster identities, then replace event facts and roles."""
        game_id = self._session.scalar(
            select(Game.id).where(Game.nhl_id == normalized.source_game_id)
        )
        if game_id is None:
            raise ValueError(
                f"game {normalized.source_game_id} must be ingested before its play-by-play"
            )

        roster_rows = normalized.roster.to_dicts()
        event_rows = normalized.events.to_dicts()
        participant_rows = normalized.participants.to_dicts()
        if not event_rows:
            raise ValueError("play-by-play must contain at least one event")

        self._upsert_players(roster_rows)
        source_player_ids = {
            int(row["source_player_id"]) for row in [*roster_rows, *participant_rows]
        }
        player_ids = self._player_ids(source_player_ids)
        team_ids = self._team_ids(event_rows)

        self._session.execute(delete(GameEvent).where(GameEvent.game_id == game_id))
        event_ids = self._insert_events(game_id, team_ids, event_rows)
        self._insert_participants(event_ids, player_ids, participant_rows)
        return PlayByPlayReplaceResult(
            players=len(roster_rows),
            events=len(event_rows),
            participants=len(participant_rows),
        )

    def _upsert_players(self, rows: list[dict[str, Any]]) -> None:
        if not rows:
            return
        player_insert = insert(Player)
        self._session.execute(
            player_insert.values(
                [
                    {
                        "nhl_id": row["source_player_id"],
                        "display_name": row["display_name"],
                        "position": row["position"],
                    }
                    for row in rows
                ]
            ).on_conflict_do_update(
                index_elements=[Player.nhl_id],
                set_={
                    "display_name": player_insert.excluded.display_name,
                    "position": func.coalesce(
                        player_insert.excluded.position,
                        Player.position,
                    ),
                },
            )
        )

    def _player_ids(self, source_ids: set[int]) -> dict[int, int]:
        if not source_ids:
            return {}
        return {
            source_id: player_id
            for source_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_ids))
            ).tuples()
        }

    def _team_ids(self, rows: list[dict[str, Any]]) -> dict[int, int]:
        source_ids = {
            int(source_id)
            for row in rows
            if (source_id := row["source_event_owner_team_id"]) is not None
        }
        if not source_ids:
            return {}
        team_ids = {
            source_id: team_id
            for source_id, team_id in self._session.execute(
                select(Team.nhl_id, Team.id).where(Team.nhl_id.in_(source_ids))
            ).tuples()
        }
        missing_teams = source_ids - team_ids.keys()
        if missing_teams:
            raise ValueError(f"event owners missing team identities: {sorted(missing_teams)}")
        return team_ids

    def _insert_events(
        self,
        game_id: int,
        team_ids: dict[int, int],
        rows: list[dict[str, Any]],
    ) -> dict[int, int]:
        values = []
        for row in rows:
            source_team_id = row.pop("source_event_owner_team_id")
            row.pop("source_game_id")
            values.append(
                {
                    "game_id": game_id,
                    "event_owner_team_id": (
                        team_ids[int(source_team_id)] if source_team_id is not None else None
                    ),
                    **row,
                }
            )
        return {
            source_event_id: event_id
            for source_event_id, event_id in self._session.execute(
                insert(GameEvent).values(values).returning(GameEvent.source_event_id, GameEvent.id)
            ).tuples()
        }

    def _insert_participants(
        self,
        event_ids: dict[int, int],
        player_ids: dict[int, int],
        rows: list[dict[str, Any]],
    ) -> None:
        if not rows:
            return
        self._session.execute(
            insert(GameEventPlayer).values(
                [
                    {
                        "game_event_id": event_ids[int(row["source_event_id"])],
                        "source_player_id": int(row["source_player_id"]),
                        "player_id": player_ids.get(int(row["source_player_id"])),
                        "role": row["role"],
                    }
                    for row in rows
                ]
            )
        )
