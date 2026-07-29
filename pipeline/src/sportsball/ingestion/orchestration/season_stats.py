"""Build audited season statistics from canonical game-level facts."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import polars as pl
from sqlalchemy import select, update

from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.normalization.season_stats import (
    goalie_season_stats_frame,
    skater_season_stats_frame,
    team_season_stats_frame,
)
from sportsball.persistence.database import engine, session_scope
from sportsball.persistence.models import (
    Game,
    GoalieGameStats,
    IngestionRun,
    PlayerGameStats,
    TeamGameStats,
)
from sportsball.persistence.repositories.season_stats import SeasonStatsRepository

NHL_SEASON_GAME_TYPES = (2, 3)


@dataclass(frozen=True)
class SeasonStatsBuildResult:
    """Summary of one successful aggregate build."""

    run_id: uuid.UUID
    start_season: int
    end_season: int
    skaters_processed: int
    goalies_processed: int
    teams_processed: int

    @property
    def records_processed(self) -> int:
        """Return the total aggregate records materialized."""
        return self.skaters_processed + self.goalies_processed + self.teams_processed


def build_season_stats(start_season: int, end_season: int) -> SeasonStatsBuildResult:
    """Derive and transactionally replace season statistics for an inclusive range."""
    season_ids = season_ids_in_range(start_season, end_season)
    with session_scope() as session:
        run = IngestionRun(
            job_name="build_season_stats",
            status="running",
            parameters={"start_season": start_season, "end_season": end_season},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        skater_games, goalie_games, team_games = _load_game_stats(season_ids)
        skaters = skater_season_stats_frame(skater_games)
        goalies = goalie_season_stats_frame(goalie_games)
        teams = team_season_stats_frame(team_games)
        _reconcile(skaters, goalies, teams, team_games)

        with session_scope() as session:
            result = SeasonStatsRepository(session).replace(
                season_ids,
                skaters=skaters,
                goalies=goalies,
                teams=teams,
            )
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=result.total,
                    finished_at=datetime.now(UTC),
                )
            )
    except Exception as error:
        with session_scope() as session:
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="failed",
                    error_message=str(error),
                    finished_at=datetime.now(UTC),
                )
            )
        raise

    return SeasonStatsBuildResult(
        run_id=run_id,
        start_season=start_season,
        end_season=end_season,
        skaters_processed=result.skaters,
        goalies_processed=result.goalies,
        teams_processed=result.teams,
    )


def _load_game_stats(
    season_ids: list[int],
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    game_filters = (
        Game.season_id.in_(season_ids),
        Game.game_type.in_(NHL_SEASON_GAME_TYPES),
    )
    skater_query = (
        select(
            Game.season_id,
            Game.game_type,
            PlayerGameStats.player_id,
            PlayerGameStats.team_id,
            PlayerGameStats.goals,
            PlayerGameStats.assists,
            PlayerGameStats.points,
            PlayerGameStats.plus_minus,
            PlayerGameStats.penalty_minutes,
            PlayerGameStats.hits,
            PlayerGameStats.power_play_goals,
            PlayerGameStats.shots_on_goal,
            PlayerGameStats.blocked_shots,
            PlayerGameStats.giveaways,
            PlayerGameStats.takeaways,
            PlayerGameStats.shifts,
            PlayerGameStats.time_on_ice_seconds,
        )
        .join(PlayerGameStats, PlayerGameStats.game_id == Game.id)
        .where(*game_filters)
    )
    goalie_query = (
        select(
            Game.season_id,
            Game.game_type,
            GoalieGameStats.player_id,
            GoalieGameStats.team_id,
            GoalieGameStats.starter,
            GoalieGameStats.decision,
            GoalieGameStats.goals_against,
            GoalieGameStats.shots_against,
            GoalieGameStats.saves,
            GoalieGameStats.even_strength_goals_against,
            GoalieGameStats.even_strength_saves,
            GoalieGameStats.even_strength_shots_against,
            GoalieGameStats.power_play_goals_against,
            GoalieGameStats.power_play_saves,
            GoalieGameStats.power_play_shots_against,
            GoalieGameStats.shorthanded_goals_against,
            GoalieGameStats.shorthanded_saves,
            GoalieGameStats.shorthanded_shots_against,
            GoalieGameStats.penalty_minutes,
            GoalieGameStats.time_on_ice_seconds,
        )
        .join(GoalieGameStats, GoalieGameStats.game_id == Game.id)
        .where(*game_filters)
    )
    team_query = (
        select(
            Game.id.label("game_id"),
            Game.season_id,
            Game.game_type,
            Game.last_period_type,
            TeamGameStats.team_id,
            TeamGameStats.score,
            TeamGameStats.shots_on_goal,
        )
        .join(TeamGameStats, TeamGameStats.game_id == Game.id)
        .where(*game_filters)
    )
    with engine.connect() as connection:
        return (
            pl.read_database(skater_query, connection),
            pl.read_database(goalie_query, connection),
            pl.read_database(team_query, connection),
        )


def _reconcile(
    skaters: pl.DataFrame,
    goalies: pl.DataFrame,
    teams: pl.DataFrame,
    team_games: pl.DataFrame,
) -> None:
    if skaters.filter(pl.col("points") != pl.col("goals") + pl.col("assists")).height:
        raise ValueError("skater aggregate reconciliation failed: points != goals + assists")
    if goalies.filter(
        pl.col("games_played") < pl.col("wins") + pl.col("losses") + pl.col("overtime_losses")
    ).height:
        raise ValueError("goalie aggregate reconciliation failed: decisions exceed games")
    expected_team_games = team_games.height
    if teams["games_played"].sum() != expected_team_games:
        raise ValueError("team aggregate reconciliation failed: game counts changed")
    if teams["wins"].sum() != teams["losses"].sum():
        raise ValueError("team aggregate reconciliation failed: wins and losses differ")
    if teams.filter(
        pl.col("wins")
        != pl.col("regulation_wins") + pl.col("overtime_wins") + pl.col("shootout_wins")
    ).height:
        raise ValueError("team aggregate reconciliation failed: win types do not sum")
    if teams.filter(
        pl.col("losses")
        != pl.col("regulation_losses") + pl.col("overtime_losses") + pl.col("shootout_losses")
    ).height:
        raise ValueError("team aggregate reconciliation failed: loss types do not sum")
