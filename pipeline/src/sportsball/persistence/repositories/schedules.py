"""Idempotent PostgreSQL persistence for normalized NHL schedules."""

from dataclasses import dataclass
from typing import Any

import polars as pl
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.persistence.models import Game, Season, Team, TeamSeason
from sportsball.reference.team_identities import team_identity, team_season_identity


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
                    "franchise_id": func.coalesce(
                        insert(Team).excluded.franchise_id,
                        Team.franchise_id,
                    ),
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
        team_season_rows = self._team_season_rows(rows, team_ids)
        team_season_insert = insert(TeamSeason)
        self._session.execute(
            team_season_insert.values(team_season_rows).on_conflict_do_update(
                constraint="uq_team_seasons_team_season",
                set_={
                    "abbreviation": team_season_insert.excluded.abbreviation,
                    "place_name": team_season_insert.excluded.place_name,
                    "common_name": team_season_insert.excluded.common_name,
                    "full_name": team_season_insert.excluded.full_name,
                },
            )
        )
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
    def _team_rows(rows: list[dict[str, Any]]) -> list[dict[str, int | str | None]]:
        teams: dict[int, dict[str, int | str | None]] = {}
        for row in rows:
            for side in ("away", "home"):
                nhl_id = int(row[f"{side}_team_id"])
                identity = team_identity(nhl_id)
                teams[nhl_id] = {
                    "nhl_id": nhl_id,
                    "franchise_id": identity.franchise_id if identity else None,
                    "abbreviation": str(row[f"{side}_team_abbrev"]),
                    "name": str(row[f"{side}_team_name"]),
                }
        return [teams[nhl_id] for nhl_id in sorted(teams)]

    @staticmethod
    def _team_season_rows(
        rows: list[dict[str, Any]],
        team_ids: dict[int, int],
    ) -> list[dict[str, int | str | None]]:
        team_seasons: dict[tuple[int, int], dict[str, int | str | None]] = {}
        for row in rows:
            season_id = int(row["season_id"])
            for side in ("away", "home"):
                nhl_id = int(row[f"{side}_team_id"])
                identity = team_season_identity(nhl_id, season_id)
                abbreviation = (
                    identity.abbreviation if identity else str(row[f"{side}_team_abbrev"])
                )
                common_name = identity.common_name if identity else str(row[f"{side}_team_name"])
                place_name = identity.place_name if identity else None
                full_name = (
                    identity.full_name
                    if identity
                    else " ".join(part for part in (place_name, common_name) if part)
                )
                team_seasons[(team_ids[nhl_id], season_id)] = {
                    "team_id": team_ids[nhl_id],
                    "season_id": season_id,
                    "abbreviation": abbreviation,
                    "place_name": place_name,
                    "common_name": common_name,
                    "full_name": full_name,
                }
        return [team_seasons[key] for key in sorted(team_seasons, key=lambda key: (key[1], key[0]))]
