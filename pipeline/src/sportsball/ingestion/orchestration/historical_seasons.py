"""Audited ingestion of NHL all-time season summaries."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.stats_client import NhlStatsClient, StatsReportFetch
from sportsball.clients.nhl.stats_schemas import (
    GoalieSeasonSummary,
    SkaterSeasonSummary,
    TeamSeasonSummary,
)
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.normalization.historical_seasons import historical_season_frames
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.historical_seasons import HistoricalSeasonRepository

NHL_GAME_TYPES = (2, 3)


@dataclass(frozen=True)
class HistoricalSeasonIngestionResult:
    """Summary of one all-time season ingestion range."""

    run_id: uuid.UUID
    start_season: int
    end_season: int
    skaters_processed: int
    goalies_processed: int
    teams_processed: int

    @property
    def records_processed(self) -> int:
        return self.skaters_processed + self.goalies_processed + self.teams_processed


def ingest_historical_seasons(
    start_season: int,
    end_season: int,
    client: NhlStatsClient,
    *,
    on_season_complete: Callable[[int], None] | None = None,
) -> HistoricalSeasonIngestionResult:
    """Fetch and transactionally replace an inclusive season range."""
    season_ids = season_ids_in_range(start_season, end_season)
    run_id = _start_run(start_season, end_season)
    skaters: list[tuple[int, SkaterSeasonSummary]] = []
    goalies: list[tuple[int, GoalieSeasonSummary]] = []
    teams: list[tuple[int, TeamSeasonSummary]] = []
    payloads: list[tuple[str, str, StatsReportFetch[Any]]] = []

    try:
        for season_id in season_ids:
            for game_type in NHL_GAME_TYPES:
                skater_fetch = client.fetch_skaters(season_id, game_type)
                goalie_fetch = client.fetch_goalies(season_id, game_type)
                team_fetch = client.fetch_teams(season_id, game_type)
                skaters.extend((game_type, row) for row in skater_fetch.rows)
                goalies.extend((game_type, row) for row in goalie_fetch.rows)
                teams.extend((game_type, row) for row in team_fetch.rows)
                source_key = f"{season_id}:{game_type}"
                payloads.extend(
                    (
                        ("historical_skater_season", source_key, skater_fetch),
                        ("historical_goalie_season", source_key, goalie_fetch),
                        ("historical_team_season", source_key, team_fetch),
                    )
                )
            if on_season_complete is not None:
                on_season_complete(season_id)

        frames = historical_season_frames(skaters, goalies, teams)
        with session_scope() as session:
            source_insert = insert(SourcePayload)
            for resource_type, source_key, fetched in payloads:
                session.execute(
                    source_insert.values(
                        ingestion_run_id=run_id,
                        provider="nhl_stats",
                        resource_type=resource_type,
                        source_key=source_key,
                        checksum=fetched.checksum,
                        payload=fetched.payload,
                    ).on_conflict_do_nothing(constraint="uq_source_payload_identity")
                )
            counts = HistoricalSeasonRepository(session).replace(
                season_ids,
                skaters=frames.skaters,
                goalies=frames.goalies,
                teams=frames.teams,
            )
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=sum(counts),
                    finished_at=datetime.now(UTC),
                )
            )
    except Exception as error:
        _fail_run(run_id, error)
        raise

    return HistoricalSeasonIngestionResult(
        run_id=run_id,
        start_season=start_season,
        end_season=end_season,
        skaters_processed=counts[0],
        goalies_processed=counts[1],
        teams_processed=counts[2],
    )


def _start_run(start_season: int, end_season: int) -> uuid.UUID:
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_historical_seasons",
            status="running",
            parameters={"start_season": start_season, "end_season": end_season},
        )
        session.add(run)
        session.flush()
        return run.id


def _fail_run(run_id: uuid.UUID, error: Exception) -> None:
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
