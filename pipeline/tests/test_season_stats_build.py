"""PostgreSQL integration test for idempotent season-stat materialization."""

import os
from datetime import UTC, date, datetime
from typing import Any

import pytest
from sqlalchemy import delete, func, select

from sportsball.ingestion.orchestration.season_stats import build_season_stats
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    GoalieGameStats,
    GoalieSeasonStats,
    IngestionRun,
    Player,
    PlayerGameStats,
    Season,
    SkaterSeasonStats,
    Team,
    TeamGameStats,
    TeamSeasonStats,
)

TEST_SEASON_ID = 20972098
TEST_GAME_ID = 2097020001
TEST_TEAM_IDS = [720, 721]
TEST_PLAYER_IDS = [910001, 910002, 910003, 910004]

pytestmark = pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1",
    reason="set SPORTSBALL_RUN_DATABASE_TESTS=1 with PostgreSQL available",
)


def test_season_stats_build_is_idempotent() -> None:
    run_ids: list[Any] = []
    _create_game_facts()
    try:
        first = build_season_stats(TEST_SEASON_ID, TEST_SEASON_ID)
        second = build_season_stats(TEST_SEASON_ID, TEST_SEASON_ID)
        run_ids.extend([first.run_id, second.run_id])

        assert first.skaters_processed == 2
        assert first.goalies_processed == 2
        assert first.teams_processed == 2
        assert second.records_processed == first.records_processed

        with session_scope() as session:
            assert _season_row_count(session, SkaterSeasonStats) == 2
            assert _season_row_count(session, GoalieSeasonStats) == 2
            assert _season_row_count(session, TeamSeasonStats) == 2

            winner = session.execute(
                select(TeamSeasonStats)
                .join(Team, Team.id == TeamSeasonStats.team_id)
                .where(
                    TeamSeasonStats.season_id == TEST_SEASON_ID,
                    Team.nhl_id == TEST_TEAM_IDS[0],
                )
            ).scalar_one()
            assert winner.games_played == 1
            assert winner.wins == 1
            assert winner.losses == 0
            assert winner.goals_for == 4
            assert winner.goals_against == 2

            runs = session.scalars(select(IngestionRun).where(IngestionRun.id.in_(run_ids))).all()
            assert len(runs) == 2
            assert all(run.status == "succeeded" for run in runs)
            assert all(run.records_processed == 6 for run in runs)
    finally:
        _clean_up(run_ids)


def _season_row_count(session: Any, model: type[Any]) -> int:
    return (
        session.scalar(
            select(func.count()).select_from(model).where(model.season_id == TEST_SEASON_ID)
        )
        or 0
    )


def _create_game_facts() -> None:
    with session_scope() as session:
        session.add(Season(id=TEST_SEASON_ID, start_year=2097, end_year=2098))
        teams = [
            Team(nhl_id=source_id, abbreviation=f"T{index}", name=f"Test {index}")
            for index, source_id in enumerate(TEST_TEAM_IDS)
        ]
        players = [
            Player(
                nhl_id=source_id,
                display_name=f"Player {index}",
                position="G" if index >= 2 else "C",
            )
            for index, source_id in enumerate(TEST_PLAYER_IDS)
        ]
        session.add_all([*teams, *players])
        session.flush()
        game = Game(
            nhl_id=TEST_GAME_ID,
            season_id=TEST_SEASON_ID,
            game_type=2,
            game_date=date(2097, 10, 1),
            start_time_utc=datetime(2097, 10, 2, tzinfo=UTC),
            state="OFF",
            away_team_id=teams[0].id,
            home_team_id=teams[1].id,
        )
        session.add(game)
        session.flush()
        session.add_all(
            [
                TeamGameStats(
                    game_id=game.id,
                    team_id=teams[0].id,
                    is_home=False,
                    score=4,
                    shots_on_goal=30,
                ),
                TeamGameStats(
                    game_id=game.id,
                    team_id=teams[1].id,
                    is_home=True,
                    score=2,
                    shots_on_goal=25,
                ),
                _skater_game(game.id, teams[0].id, players[0].id, goals=2, assists=1),
                _skater_game(game.id, teams[1].id, players[1].id, goals=1, assists=0),
                _goalie_game(
                    game.id,
                    teams[0].id,
                    players[2].id,
                    decision="W",
                    goals_against=2,
                    shots_against=25,
                ),
                _goalie_game(
                    game.id,
                    teams[1].id,
                    players[3].id,
                    decision="L",
                    goals_against=4,
                    shots_against=30,
                ),
            ]
        )


def _skater_game(
    game_id: int,
    team_id: int,
    player_id: int,
    *,
    goals: int,
    assists: int,
) -> PlayerGameStats:
    return PlayerGameStats(
        game_id=game_id,
        team_id=team_id,
        player_id=player_id,
        sweater_number=10,
        position="C",
        goals=goals,
        assists=assists,
        points=goals + assists,
        plus_minus=1,
        penalty_minutes=0,
        hits=2,
        power_play_goals=0,
        shots_on_goal=4,
        faceoff_win_percentage=50.0,
        blocked_shots=1,
        giveaways=0,
        takeaways=1,
        shifts=20,
        time_on_ice_seconds=1_200,
    )


def _goalie_game(
    game_id: int,
    team_id: int,
    player_id: int,
    *,
    decision: str,
    goals_against: int,
    shots_against: int,
) -> GoalieGameStats:
    saves = shots_against - goals_against
    return GoalieGameStats(
        game_id=game_id,
        team_id=team_id,
        player_id=player_id,
        sweater_number=30,
        starter=True,
        decision=decision,
        goals_against=goals_against,
        shots_against=shots_against,
        saves=saves,
        save_percentage=saves / shots_against,
        even_strength_goals_against=goals_against,
        even_strength_saves=saves,
        even_strength_shots_against=shots_against,
        power_play_goals_against=0,
        power_play_saves=0,
        power_play_shots_against=0,
        shorthanded_goals_against=0,
        shorthanded_saves=0,
        shorthanded_shots_against=0,
        penalty_minutes=0,
        time_on_ice_seconds=3_600,
    )


def _clean_up(run_ids: list[Any]) -> None:
    with session_scope() as session:
        game_pk = session.scalar(select(Game.id).where(Game.nhl_id == TEST_GAME_ID))
        player_pks = session.scalars(
            select(Player.id).where(Player.nhl_id.in_(TEST_PLAYER_IDS))
        ).all()
        session.execute(
            delete(SkaterSeasonStats).where(SkaterSeasonStats.season_id == TEST_SEASON_ID)
        )
        session.execute(
            delete(GoalieSeasonStats).where(GoalieSeasonStats.season_id == TEST_SEASON_ID)
        )
        session.execute(delete(TeamSeasonStats).where(TeamSeasonStats.season_id == TEST_SEASON_ID))
        if game_pk is not None:
            session.execute(delete(PlayerGameStats).where(PlayerGameStats.game_id == game_pk))
            session.execute(delete(GoalieGameStats).where(GoalieGameStats.game_id == game_pk))
            session.execute(delete(TeamGameStats).where(TeamGameStats.game_id == game_pk))
        if run_ids:
            session.execute(delete(IngestionRun).where(IngestionRun.id.in_(run_ids)))
        session.execute(delete(Game).where(Game.nhl_id == TEST_GAME_ID))
        if player_pks:
            session.execute(delete(Player).where(Player.id.in_(player_pks)))
        session.execute(delete(Team).where(Team.nhl_id.in_(TEST_TEAM_IDS)))
        session.execute(delete(Season).where(Season.id == TEST_SEASON_ID))
