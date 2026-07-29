"""Idempotent PostgreSQL persistence for normalized NHL box scores."""

from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from sportsball.normalization.boxscores import NormalizedBoxscore
from sportsball.persistence.models import (
    Game,
    GoalieGameStats,
    Player,
    PlayerGameStats,
    Team,
    TeamGameStats,
)
from sportsball.reference.team_identities import team_identity


@dataclass(frozen=True)
class BoxscoreUpsertResult:
    """Counts processed while persisting one box score."""

    teams: int
    players: int
    skater_games: int
    goalie_games: int


class BoxscoreRepository:
    """Persist box-score dimensions and facts in dependency order."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def upsert(self, normalized: NormalizedBoxscore) -> BoxscoreUpsertResult:
        """Upsert teams, players, and one game's traditional statistics."""
        team_rows = normalized.team_games.to_dicts()
        skater_rows = normalized.skater_games.to_dicts()
        goalie_rows = normalized.goalie_games.to_dicts()
        if not team_rows:
            raise ValueError("box score must contain team records")

        source_game_id = int(team_rows[0]["source_game_id"])
        game_id = self._session.scalar(select(Game.id).where(Game.nhl_id == source_game_id))
        if game_id is None:
            raise ValueError(f"game {source_game_id} must be ingested before its box score")

        self._session.execute(
            update(Game)
            .where(Game.id == game_id)
            .values(last_period_type=normalized.last_period_type)
        )
        self._upsert_teams(team_rows)
        team_ids = self._team_ids(team_rows)
        player_rows = self._player_rows(skater_rows, goalie_rows)
        self._upsert_players(player_rows)
        player_ids = self._player_ids(player_rows)

        self._upsert_team_games(game_id, team_ids, team_rows)
        self._upsert_skater_games(game_id, team_ids, player_ids, skater_rows)
        self._upsert_goalie_games(game_id, team_ids, player_ids, goalie_rows)
        return BoxscoreUpsertResult(
            teams=len(team_rows),
            players=len(player_rows),
            skater_games=len(skater_rows),
            goalie_games=len(goalie_rows),
        )

    def _upsert_teams(self, rows: list[dict[str, Any]]) -> None:
        team_insert = insert(Team)
        self._session.execute(
            team_insert.values(
                [
                    {
                        "nhl_id": row["source_team_id"],
                        "franchise_id": (
                            identity.franchise_id
                            if (identity := team_identity(int(row["source_team_id"])))
                            else None
                        ),
                        "abbreviation": row["team_abbrev"],
                        "name": row["team_name"],
                    }
                    for row in rows
                ]
            ).on_conflict_do_update(
                index_elements=[Team.nhl_id],
                set_={
                    "franchise_id": func.coalesce(
                        team_insert.excluded.franchise_id,
                        Team.franchise_id,
                    ),
                    "abbreviation": team_insert.excluded.abbreviation,
                    "name": team_insert.excluded.name,
                },
            )
        )

    def _team_ids(self, rows: list[dict[str, Any]]) -> dict[int, int]:
        source_ids = [int(row["source_team_id"]) for row in rows]
        return {
            source_id: team_id
            for source_id, team_id in self._session.execute(
                select(Team.nhl_id, Team.id).where(Team.nhl_id.in_(source_ids))
            ).tuples()
        }

    @staticmethod
    def _player_rows(
        skater_rows: list[dict[str, Any]],
        goalie_rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        players: dict[int, dict[str, Any]] = {}
        for row in [*skater_rows, *goalie_rows]:
            source_id = int(row["source_player_id"])
            players[source_id] = {
                "nhl_id": source_id,
                "display_name": row["display_name"],
                "position": row["position"],
            }
        return [players[source_id] for source_id in sorted(players)]

    def _upsert_players(self, rows: list[dict[str, Any]]) -> None:
        if not rows:
            return
        player_insert = insert(Player)
        self._session.execute(
            player_insert.values(rows).on_conflict_do_update(
                index_elements=[Player.nhl_id],
                set_={
                    "display_name": player_insert.excluded.display_name,
                    "position": player_insert.excluded.position,
                },
            )
        )

    def _player_ids(self, rows: list[dict[str, Any]]) -> dict[int, int]:
        if not rows:
            return {}
        source_ids = [int(row["nhl_id"]) for row in rows]
        return {
            source_id: player_id
            for source_id, player_id in self._session.execute(
                select(Player.nhl_id, Player.id).where(Player.nhl_id.in_(source_ids))
            ).tuples()
        }

    def _upsert_team_games(
        self,
        game_id: int,
        team_ids: dict[int, int],
        rows: list[dict[str, Any]],
    ) -> None:
        values = [
            {
                "game_id": game_id,
                "team_id": team_ids[int(row["source_team_id"])],
                "is_home": row["is_home"],
                "score": row["score"],
                "shots_on_goal": row["shots_on_goal"],
            }
            for row in rows
        ]
        team_game_insert = insert(TeamGameStats)
        self._session.execute(
            team_game_insert.values(values).on_conflict_do_update(
                constraint="uq_team_game_stats_game_team",
                set_={
                    "is_home": team_game_insert.excluded.is_home,
                    "score": team_game_insert.excluded.score,
                    "shots_on_goal": team_game_insert.excluded.shots_on_goal,
                },
            )
        )

    def _upsert_skater_games(
        self,
        game_id: int,
        team_ids: dict[int, int],
        player_ids: dict[int, int],
        rows: list[dict[str, Any]],
    ) -> None:
        if not rows:
            return
        excluded = {
            "sweater_number",
            "position",
            "goals",
            "assists",
            "points",
            "plus_minus",
            "penalty_minutes",
            "hits",
            "power_play_goals",
            "shots_on_goal",
            "faceoff_win_percentage",
            "blocked_shots",
            "giveaways",
            "takeaways",
            "shifts",
            "time_on_ice_seconds",
        }
        values = [
            {
                "game_id": game_id,
                "player_id": player_ids[int(row["source_player_id"])],
                "team_id": team_ids[int(row["source_team_id"])],
                **{field: row[field] for field in excluded},
            }
            for row in rows
        ]
        skater_insert = insert(PlayerGameStats)
        self._session.execute(
            skater_insert.values(values).on_conflict_do_update(
                constraint="uq_player_game_stats_game_player",
                set_={
                    "team_id": skater_insert.excluded.team_id,
                    **{field: getattr(skater_insert.excluded, field) for field in excluded},
                },
            )
        )

    def _upsert_goalie_games(
        self,
        game_id: int,
        team_ids: dict[int, int],
        player_ids: dict[int, int],
        rows: list[dict[str, Any]],
    ) -> None:
        if not rows:
            return
        excluded = {
            "sweater_number",
            "starter",
            "decision",
            "goals_against",
            "shots_against",
            "saves",
            "save_percentage",
            "even_strength_goals_against",
            "even_strength_saves",
            "even_strength_shots_against",
            "power_play_goals_against",
            "power_play_saves",
            "power_play_shots_against",
            "shorthanded_goals_against",
            "shorthanded_saves",
            "shorthanded_shots_against",
            "penalty_minutes",
            "time_on_ice_seconds",
        }
        values = [
            {
                "game_id": game_id,
                "player_id": player_ids[int(row["source_player_id"])],
                "team_id": team_ids[int(row["source_team_id"])],
                **{field: row[field] for field in excluded},
            }
            for row in rows
        ]
        goalie_insert = insert(GoalieGameStats)
        self._session.execute(
            goalie_insert.values(values).on_conflict_do_update(
                constraint="uq_goalie_game_stats_game_player",
                set_={
                    "team_id": goalie_insert.excluded.team_id,
                    **{field: getattr(goalie_insert.excluded, field) for field in excluded},
                },
            )
        )
