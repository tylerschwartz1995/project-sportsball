"""Idempotent PostgreSQL persistence for normalized NHL schedules."""

from dataclasses import dataclass
from typing import Any

import polars as pl
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import Game, Season, Team


@dataclass(frozen=True)
class ScheduleUpsertResult:
    """Counts processed while persisting one normalized schedule."""

    seasons: int
    teams: int
    games: int


class ScheduleRepository:
    """Persist schedule dimensions and games in dependency order."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, frame: pl.DataFrame) -> ScheduleUpsertResult:
        """Upsert every season, team, and game represented in a schedule frame."""
        rows = frame.to_dicts()
        if not rows:
            return ScheduleUpsertResult(seasons=0, teams=0, games=0)

        season_rows = self._season_rows(rows)
        self._session.execute(
            insert(Season)
            .values(season_rows)
            .on_conflict_do_update(
                index_elements=[Season.id],
                set_={
                    "start_year": insert(Season).excluded.start_year,
                    "end_year": insert(Season).excluded.end_year,
                },
            )
        )

        team_rows = self._team_rows(rows)
        self._session.execute(
            insert(Team)
            .values(team_rows)
            .on_conflict_do_update(
                index_elements=[Team.nhl_id],
                set_={
                    "abbreviation": insert(Team).excluded.abbreviation,
                    "name": insert(Team).excluded.name,
                },
            )
        )

        team_ids = {
            nhl_id: team_id
            for nhl_id, team_id in self._session.execute(
                select(Team.nhl_id, Team.id).where(
                    Team.nhl_id.in_([team["nhl_id"] for team in team_rows])
                )
            ).tuples()
        }
        game_rows = [
            {
                "nhl_id": row["source_game_id"],
                "season_id": row["season_id"],
                "game_type": row["game_type"],
                "game_date": row["game_date"],
                "start_time_utc": row["start_time_utc"],
                "state": row["state"],
                "away_team_id": team_ids[row["away_team_id"]],
                "home_team_id": team_ids[row["home_team_id"]],
            }
            for row in rows
        ]
        game_insert = insert(Game)
        self._session.execute(
            game_insert.values(game_rows).on_conflict_do_update(
                index_elements=[Game.nhl_id],
                set_={
                    "season_id": game_insert.excluded.season_id,
                    "game_type": game_insert.excluded.game_type,
                    "game_date": game_insert.excluded.game_date,
                    "start_time_utc": game_insert.excluded.start_time_utc,
                    "state": game_insert.excluded.state,
                    "away_team_id": game_insert.excluded.away_team_id,
                    "home_team_id": game_insert.excluded.home_team_id,
                },
            )
        )
        return ScheduleUpsertResult(
            seasons=len(season_rows),
            teams=len(team_rows),
            games=len(game_rows),
        )

    @staticmethod
    def _season_rows(rows: list[dict[str, Any]]) -> list[dict[str, int]]:
        season_ids = {int(row["season_id"]) for row in rows}
        return [
            {
                "id": season_id,
                "start_year": season_id // 10_000,
                "end_year": season_id % 10_000,
            }
            for season_id in sorted(season_ids)
        ]

    @staticmethod
    def _team_rows(rows: list[dict[str, Any]]) -> list[dict[str, int | str]]:
        teams: dict[int, dict[str, int | str]] = {}
        for row in rows:
            for side in ("away", "home"):
                nhl_id = int(row[f"{side}_team_id"])
                teams[nhl_id] = {
                    "nhl_id": nhl_id,
                    "abbreviation": str(row[f"{side}_team_abbrev"]),
                    "name": str(row[f"{side}_team_name"]),
                }
        return [teams[nhl_id] for nhl_id in sorted(teams)]
