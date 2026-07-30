"""Read-only completeness audit for stored NHL and MoneyPuck data."""

from dataclasses import dataclass
from enum import StrEnum

from sqlalchemy import Select, func, select, union
from sqlalchemy.orm import Session

from sportsball.ingestion.orchestration.moneypuck_seasons import MONEYPUCK_FIRST_SEASON
from sportsball.ingestion.orchestration.moneypuck_shots import MONEYPUCK_FIRST_SHOT_SEASON
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import (
    Game,
    GameEvent,
    GameEventPlayer,
    GoalieGameStats,
    GoalieSeasonStats,
    MoneyPuckGoalieGameStats,
    MoneyPuckGoalieSeasonStats,
    MoneyPuckLineBackfill,
    MoneyPuckLineGameStats,
    MoneyPuckPlayerGameBackfill,
    MoneyPuckSeasonBackfill,
    MoneyPuckShot,
    MoneyPuckShotBackfill,
    MoneyPuckSkaterGameStats,
    MoneyPuckSkaterSeasonStats,
    MoneyPuckTeamGameStats,
    MoneyPuckTeamSeasonStats,
    OfficialGoalieSeasonStats,
    OfficialSkaterSeasonStats,
    OfficialStandingsSnapshot,
    Player,
    PlayerGameStats,
    ScheduleBackfillCheckpoint,
    Season,
    SkaterSeasonStats,
    TeamGameStats,
    TeamSeasonStats,
)

NHL_GAME_TYPES = (2, 3)
FINAL_GAME_STATES = ("OFF", "FINAL")


class Severity(StrEnum):
    """Audit issue severity."""

    ERROR = "error"
    WARNING = "warning"


@dataclass(frozen=True)
class AuditIssue:
    """One actionable completeness finding."""

    severity: Severity
    check: str
    detail: str


@dataclass(frozen=True)
class SeasonCounts:
    """Stored counts used to assess one season."""

    season_id: int
    schedule_status: str | None = None
    expected_games: int = 0
    stored_games: int = 0
    final_games: int = 0
    boxscore_games: int = 0
    play_by_play_games: int = 0
    missing_game_outcomes: int = 0
    invalid_team_game_rows: int = 0
    team_season_rows: int = 0
    team_season_games: int = 0
    skater_season_rows: int = 0
    goalie_season_rows: int = 0
    official_standings_rows: int = 0
    official_skater_rows: int = 0
    official_goalie_rows: int = 0
    players_missing_profiles: int = 0
    unresolved_event_players: int = 0
    moneypuck_skater_season_rows: int = 0
    moneypuck_goalie_season_rows: int = 0
    moneypuck_team_season_rows: int = 0
    moneypuck_team_game_rows: int = 0
    moneypuck_skater_game_rows: int = 0
    moneypuck_goalie_game_rows: int = 0
    moneypuck_shot_rows: int = 0
    moneypuck_line_rows: int = 0
    moneypuck_summary_status: str | None = None
    moneypuck_player_game_status: str | None = None
    moneypuck_shot_status: str | None = None
    moneypuck_line_status: str | None = None


@dataclass(frozen=True)
class SeasonAudit:
    """Counts and findings for one season."""

    counts: SeasonCounts
    issues: tuple[AuditIssue, ...]

    @property
    def has_errors(self) -> bool:
        """Return whether this season has a failed completeness check."""
        return any(issue.severity is Severity.ERROR for issue in self.issues)

    @property
    def has_warnings(self) -> bool:
        """Return whether this season has a non-fatal coverage warning."""
        return any(issue.severity is Severity.WARNING for issue in self.issues)


@dataclass(frozen=True)
class CompletenessAudit:
    """Completeness results for an inclusive season range."""

    start_season: int
    end_season: int
    seasons: tuple[SeasonAudit, ...]

    @property
    def errors(self) -> int:
        """Return the number of error findings."""
        return sum(
            issue.severity is Severity.ERROR for season in self.seasons for issue in season.issues
        )

    @property
    def warnings(self) -> int:
        """Return the number of warning findings."""
        return sum(
            issue.severity is Severity.WARNING for season in self.seasons for issue in season.issues
        )

    @property
    def passed_seasons(self) -> int:
        """Return seasons without error findings."""
        return sum(not season.has_errors for season in self.seasons)


def audit_completeness(start_season: int, end_season: int) -> CompletenessAudit:
    """Load stored counts and evaluate completeness without changing data."""
    season_ids = season_ids_in_range(start_season, end_season)
    with session_scope() as session:
        counts = _load_counts(session, season_ids)
    return CompletenessAudit(
        start_season=start_season,
        end_season=end_season,
        seasons=tuple(
            SeasonAudit(counts=season_counts, issues=evaluate_season(season_counts))
            for season_counts in counts
        ),
    )


def evaluate_season(counts: SeasonCounts) -> tuple[AuditIssue, ...]:
    """Evaluate source-aware completeness rules for one season."""
    issues: list[AuditIssue] = []

    def error(check: str, detail: str) -> None:
        issues.append(AuditIssue(Severity.ERROR, check, detail))

    def warning(check: str, detail: str) -> None:
        issues.append(AuditIssue(Severity.WARNING, check, detail))

    if counts.schedule_status != "completed":
        error(
            "schedule",
            f"schedule checkpoint is {counts.schedule_status or 'missing'}, not completed",
        )
    if counts.stored_games != counts.expected_games:
        error(
            "schedule",
            f"stored games {counts.stored_games} != checkpoint games {counts.expected_games}",
        )
    if counts.boxscore_games != counts.final_games:
        error(
            "boxscores",
            f"complete box scores {counts.boxscore_games} != completed games {counts.final_games}",
        )
    if counts.play_by_play_games != counts.final_games:
        error(
            "play_by_play",
            f"event timelines {counts.play_by_play_games} != completed games {counts.final_games}",
        )
    if counts.missing_game_outcomes:
        error(
            "game_outcomes",
            f"{counts.missing_game_outcomes} completed games lack an ending type",
        )
    if counts.invalid_team_game_rows:
        error(
            "team_game_identity",
            f"{counts.invalid_team_game_rows} team-game rows do not belong to the game's teams",
        )
    if counts.team_season_games != counts.boxscore_games * 2:
        error(
            "derived_team_stats",
            f"derived games {counts.team_season_games} != expected {counts.boxscore_games * 2}",
        )
    if counts.final_games and not counts.skater_season_rows:
        error("derived_skater_stats", "no derived skater season rows")
    if counts.final_games and not counts.goalie_season_rows:
        error("derived_goalie_stats", "no derived goalie season rows")
    if not counts.official_standings_rows:
        error("official_standings", "no NHL standings snapshot rows")
    if not counts.official_skater_rows:
        error("official_player_stats", "no NHL-published skater season rows")
    if not counts.official_goalie_rows:
        error("official_player_stats", "no NHL-published goalie season rows")
    if counts.players_missing_profiles:
        error(
            "player_profiles",
            f"{counts.players_missing_profiles} participating players lack profiles",
        )
    if counts.unresolved_event_players:
        warning(
            "event_participants",
            f"{counts.unresolved_event_players} source player references remain unmapped",
        )

    if counts.season_id >= MONEYPUCK_FIRST_SEASON:
        summary_counts = (
            counts.moneypuck_skater_season_rows,
            counts.moneypuck_goalie_season_rows,
            counts.moneypuck_team_season_rows,
        )
        if counts.moneypuck_summary_status != "completed" or any(
            value == 0 for value in summary_counts
        ):
            error(
                "moneypuck_summaries",
                "season-summary backfill is incomplete or a summary table is empty",
            )
        if not counts.moneypuck_team_game_rows:
            error("moneypuck_team_games", "no team game-level rows")
        if counts.moneypuck_player_game_status != "completed" or (
            not counts.moneypuck_skater_game_rows or not counts.moneypuck_goalie_game_rows
        ):
            error(
                "moneypuck_player_games",
                "player-game backfill is incomplete or a player table is empty",
            )
        if counts.moneypuck_line_status != "completed" or not counts.moneypuck_line_rows:
            error("moneypuck_lines", "line/pairing backfill is incomplete or empty")

    if counts.season_id >= MONEYPUCK_FIRST_SHOT_SEASON and (
        counts.moneypuck_shot_status != "completed" or not counts.moneypuck_shot_rows
    ):
        error("moneypuck_shots", "shot backfill is incomplete or empty")

    return tuple(issues)


def format_season_audit(season: SeasonAudit) -> tuple[str, ...]:
    """Render one compact, human-readable season report."""
    counts = season.counts
    if season.has_errors:
        status = "FAIL"
    elif season.has_warnings:
        status = "WARN"
    else:
        status = "PASS"

    if counts.season_id >= MONEYPUCK_FIRST_SEASON:
        moneypuck = (
            f"summary={counts.moneypuck_skater_season_rows}/"
            f"{counts.moneypuck_goalie_season_rows}/"
            f"{counts.moneypuck_team_season_rows} "
            f"team_games={counts.moneypuck_team_game_rows} "
            f"player_games={counts.moneypuck_skater_game_rows}/"
            f"{counts.moneypuck_goalie_game_rows} "
            f"shots={counts.moneypuck_shot_rows} lines={counts.moneypuck_line_rows}"
        )
    elif counts.season_id >= MONEYPUCK_FIRST_SHOT_SEASON:
        moneypuck = f"summary=n/a shots={counts.moneypuck_shot_rows}"
    else:
        moneypuck = "n/a"

    lines = [
        (
            f"season={counts.season_id} status={status} "
            f"games={counts.stored_games}/{counts.expected_games} "
            f"final={counts.final_games} boxscores={counts.boxscore_games} "
            f"play_by_play={counts.play_by_play_games} "
            f"standings={counts.official_standings_rows} "
            f"profiles_missing={counts.players_missing_profiles} "
            f"moneypuck[{moneypuck}]"
        )
    ]
    lines.extend(
        f"  {issue.severity.value}: {issue.check}: {issue.detail}" for issue in season.issues
    )
    return tuple(lines)


def _load_counts(session: Session, season_ids: list[int]) -> list[SeasonCounts]:
    existing = set(session.scalars(select(Season.id).where(Season.id.in_(season_ids))).all())
    missing = sorted(set(season_ids) - existing)
    if missing:
        raise ValueError(f"seasons do not exist: {missing}")

    checkpoints = {
        season_id: (status, games)
        for season_id, status, games in session.execute(
            select(
                ScheduleBackfillCheckpoint.season_id,
                ScheduleBackfillCheckpoint.status,
                ScheduleBackfillCheckpoint.games_processed,
            ).where(ScheduleBackfillCheckpoint.season_id.in_(season_ids))
        )
    }
    games = _group_counts(
        session,
        select(Game.season_id, func.count())
        .where(Game.season_id.in_(season_ids), Game.game_type.in_(NHL_GAME_TYPES))
        .group_by(Game.season_id),
    )
    final_games = _group_counts(
        session,
        select(Game.season_id, func.count())
        .where(
            Game.season_id.in_(season_ids),
            Game.game_type.in_(NHL_GAME_TYPES),
            Game.state.in_(FINAL_GAME_STATES),
        )
        .group_by(Game.season_id),
    )
    complete_boxscores = (
        select(TeamGameStats.game_id)
        .group_by(TeamGameStats.game_id)
        .having(func.count() == 2)
        .subquery()
    )
    boxscores = _group_counts(
        session,
        select(Game.season_id, func.count())
        .join(complete_boxscores, complete_boxscores.c.game_id == Game.id)
        .where(
            Game.season_id.in_(season_ids),
            Game.game_type.in_(NHL_GAME_TYPES),
            Game.state.in_(FINAL_GAME_STATES),
        )
        .group_by(Game.season_id),
    )
    play_by_play = _group_counts(
        session,
        select(Game.season_id, func.count(func.distinct(GameEvent.game_id)))
        .join(GameEvent, GameEvent.game_id == Game.id)
        .where(
            Game.season_id.in_(season_ids),
            Game.game_type.in_(NHL_GAME_TYPES),
            Game.state.in_(FINAL_GAME_STATES),
        )
        .group_by(Game.season_id),
    )
    missing_outcomes = _group_counts(
        session,
        select(Game.season_id, func.count())
        .where(
            Game.season_id.in_(season_ids),
            Game.game_type.in_(NHL_GAME_TYPES),
            Game.state.in_(FINAL_GAME_STATES),
            Game.last_period_type.is_(None),
        )
        .group_by(Game.season_id),
    )
    invalid_team_games = _group_counts(
        session,
        select(Game.season_id, func.count())
        .join(TeamGameStats, TeamGameStats.game_id == Game.id)
        .where(
            Game.season_id.in_(season_ids),
            TeamGameStats.team_id.notin_((Game.away_team_id, Game.home_team_id)),
        )
        .group_by(Game.season_id),
    )
    team_season_rows, team_season_games = _group_count_and_sum(
        session,
        select(
            TeamSeasonStats.season_id,
            func.count(),
            func.coalesce(func.sum(TeamSeasonStats.games_played), 0),
        )
        .where(TeamSeasonStats.season_id.in_(season_ids))
        .group_by(TeamSeasonStats.season_id),
    )
    skater_seasons = _count_direct(session, SkaterSeasonStats, season_ids)
    goalie_seasons = _count_direct(session, GoalieSeasonStats, season_ids)
    standings = _count_direct(session, OfficialStandingsSnapshot, season_ids)
    official_skaters = _count_direct(session, OfficialSkaterSeasonStats, season_ids)
    official_goalies = _count_direct(session, OfficialGoalieSeasonStats, season_ids)
    missing_profiles = _missing_profile_counts(session, season_ids)
    unresolved_events = _group_counts(
        session,
        select(Game.season_id, func.count())
        .join(GameEvent, GameEvent.game_id == Game.id)
        .join(GameEventPlayer, GameEventPlayer.game_event_id == GameEvent.id)
        .where(
            Game.season_id.in_(season_ids),
            GameEventPlayer.player_id.is_(None),
        )
        .group_by(Game.season_id),
    )

    mp_skater_seasons = _count_direct(session, MoneyPuckSkaterSeasonStats, season_ids)
    mp_goalie_seasons = _count_direct(session, MoneyPuckGoalieSeasonStats, season_ids)
    mp_team_seasons = _count_direct(session, MoneyPuckTeamSeasonStats, season_ids)
    mp_team_games = _count_via_game(session, MoneyPuckTeamGameStats, season_ids)
    mp_skater_games = _count_via_game(session, MoneyPuckSkaterGameStats, season_ids)
    mp_goalie_games = _count_via_game(session, MoneyPuckGoalieGameStats, season_ids)
    mp_shots = _count_via_game(session, MoneyPuckShot, season_ids)
    mp_lines = _count_via_game(session, MoneyPuckLineGameStats, season_ids)

    summary_statuses = _status_by_season(session, MoneyPuckSeasonBackfill, season_ids)
    player_statuses = _status_by_season(session, MoneyPuckPlayerGameBackfill, season_ids)
    shot_statuses = _status_by_season(session, MoneyPuckShotBackfill, season_ids)
    line_statuses = _status_by_season(session, MoneyPuckLineBackfill, season_ids)

    results: list[SeasonCounts] = []
    for season_id in season_ids:
        checkpoint = checkpoints.get(season_id)
        results.append(
            SeasonCounts(
                season_id=season_id,
                schedule_status=checkpoint[0] if checkpoint else None,
                expected_games=checkpoint[1] if checkpoint else 0,
                stored_games=games.get(season_id, 0),
                final_games=final_games.get(season_id, 0),
                boxscore_games=boxscores.get(season_id, 0),
                play_by_play_games=play_by_play.get(season_id, 0),
                missing_game_outcomes=missing_outcomes.get(season_id, 0),
                invalid_team_game_rows=invalid_team_games.get(season_id, 0),
                team_season_rows=team_season_rows.get(season_id, 0),
                team_season_games=team_season_games.get(season_id, 0),
                skater_season_rows=skater_seasons.get(season_id, 0),
                goalie_season_rows=goalie_seasons.get(season_id, 0),
                official_standings_rows=standings.get(season_id, 0),
                official_skater_rows=official_skaters.get(season_id, 0),
                official_goalie_rows=official_goalies.get(season_id, 0),
                players_missing_profiles=missing_profiles.get(season_id, 0),
                unresolved_event_players=unresolved_events.get(season_id, 0),
                moneypuck_skater_season_rows=mp_skater_seasons.get(season_id, 0),
                moneypuck_goalie_season_rows=mp_goalie_seasons.get(season_id, 0),
                moneypuck_team_season_rows=mp_team_seasons.get(season_id, 0),
                moneypuck_team_game_rows=mp_team_games.get(season_id, 0),
                moneypuck_skater_game_rows=mp_skater_games.get(season_id, 0),
                moneypuck_goalie_game_rows=mp_goalie_games.get(season_id, 0),
                moneypuck_shot_rows=mp_shots.get(season_id, 0),
                moneypuck_line_rows=mp_lines.get(season_id, 0),
                moneypuck_summary_status=summary_statuses.get(season_id),
                moneypuck_player_game_status=player_statuses.get(season_id),
                moneypuck_shot_status=shot_statuses.get(season_id),
                moneypuck_line_status=line_statuses.get(season_id),
            )
        )
    return results


def _group_counts(session: Session, statement: Select[tuple[int, int]]) -> dict[int, int]:
    return {int(season_id): int(count) for season_id, count in session.execute(statement)}


def _group_count_and_sum(
    session: Session,
    statement: Select[tuple[int, int, int]],
) -> tuple[dict[int, int], dict[int, int]]:
    counts: dict[int, int] = {}
    totals: dict[int, int] = {}
    for season_id, count, total in session.execute(statement):
        counts[int(season_id)] = int(count)
        totals[int(season_id)] = int(total)
    return counts, totals


def _count_direct(
    session: Session,
    model: type[
        SkaterSeasonStats
        | GoalieSeasonStats
        | OfficialStandingsSnapshot
        | OfficialSkaterSeasonStats
        | OfficialGoalieSeasonStats
        | MoneyPuckSkaterSeasonStats
        | MoneyPuckGoalieSeasonStats
        | MoneyPuckTeamSeasonStats
    ],
    season_ids: list[int],
) -> dict[int, int]:
    return _group_counts(
        session,
        select(model.season_id, func.count())
        .where(model.season_id.in_(season_ids))
        .group_by(model.season_id),
    )


def _count_via_game(
    session: Session,
    model: type[
        MoneyPuckTeamGameStats
        | MoneyPuckSkaterGameStats
        | MoneyPuckGoalieGameStats
        | MoneyPuckShot
        | MoneyPuckLineGameStats
    ],
    season_ids: list[int],
) -> dict[int, int]:
    return _group_counts(
        session,
        select(Game.season_id, func.count())
        .join(model, model.game_id == Game.id)
        .where(Game.season_id.in_(season_ids))
        .group_by(Game.season_id),
    )


def _status_by_season(
    session: Session,
    model: type[
        MoneyPuckSeasonBackfill
        | MoneyPuckPlayerGameBackfill
        | MoneyPuckShotBackfill
        | MoneyPuckLineBackfill
    ],
    season_ids: list[int],
) -> dict[int, str]:
    return {
        int(season_id): str(status)
        for season_id, status in session.execute(
            select(model.season_id, model.status).where(model.season_id.in_(season_ids))
        )
    }


def _missing_profile_counts(session: Session, season_ids: list[int]) -> dict[int, int]:
    skaters = (
        select(
            Game.season_id.label("season_id"),
            PlayerGameStats.player_id.label("player_id"),
        )
        .join(PlayerGameStats, PlayerGameStats.game_id == Game.id)
        .where(Game.season_id.in_(season_ids))
    )
    goalies = (
        select(
            Game.season_id.label("season_id"),
            GoalieGameStats.player_id.label("player_id"),
        )
        .join(GoalieGameStats, GoalieGameStats.game_id == Game.id)
        .where(Game.season_id.in_(season_ids))
    )
    participants = union(skaters, goalies).subquery()
    return _group_counts(
        session,
        select(participants.c.season_id, func.count())
        .join(Player, Player.id == participants.c.player_id)
        .where(Player.profile_updated_at.is_(None))
        .group_by(participants.c.season_id),
    )
