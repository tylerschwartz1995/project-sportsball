"""Source-specific game coverage, independent of download success timestamps."""

from datetime import date

from sqlalchemy import select

from sportsball.operations.daily_state import final_games
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    MoneyPuckGoalieGameStats,
    MoneyPuckLineGameStats,
    MoneyPuckShot,
    MoneyPuckSkaterGameStats,
    MoneyPuckTeamGameStats,
)


def moneypuck_coverage(season_id: int, through: date) -> dict[str, int | str | None]:
    """Count supported game/dataset pairs separately for regular season and playoffs."""
    games = final_games(season_id, through)
    expected = 0
    missing: list[date] = []
    result: dict[str, int | str | None] = {}
    with session_scope() as session:
        for label, model, regular_only in (
            ("team_games", MoneyPuckTeamGameStats, False),
            ("skater_games", MoneyPuckSkaterGameStats, True),
            ("goalie_games", MoneyPuckGoalieGameStats, True),
            ("shots", MoneyPuckShot, False),
            ("lines", MoneyPuckLineGameStats, True),
        ):
            for phase in (2, 3):
                if regular_only and phase == 3:
                    continue
                phase_games = [game for game in games if game.game_type == phase]
                ids = [game.id for game in phase_games]
                present = set(
                    session.scalars(
                        select(model.game_id)
                        .where(
                            model.game_id.in_(ids),
                        )
                        .distinct()
                    ).all()
                )
                absent = [game.game_date for game in phase_games if game.id not in present]
                expected += len(ids)
                missing.extend(absent)
                result[f"{label}_{phase}_missing"] = len(absent)
    result.update(
        expected=expected,
        missing=len(missing),
        oldest_missing_date=min(missing).isoformat() if missing else None,
        latest_final_date=max(g.game_date for g in games).isoformat() if games else None,
    )
    return result
