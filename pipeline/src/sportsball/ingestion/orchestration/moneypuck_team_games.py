"""Audited ingestion of MoneyPuck all-team game-level metrics."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import update

from sportsball.clients.moneypuck.client import MoneyPuckClient
from sportsball.ingestion.orchestration.moneypuck_seasons import (
    MONEYPUCK_FIRST_SEASON,
    store_source_artifact,
)
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.normalization.moneypuck_team_games import moneypuck_team_game_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun
from sportsball.persistence.repositories.moneypuck_team_games import (
    MoneyPuckTeamGameRepository,
)


@dataclass(frozen=True)
class MoneyPuckTeamGameIngestionResult:
    """Summary of one bounded team-game ingestion."""

    run_id: uuid.UUID
    start_season: int
    end_season: int
    rows_processed: int


def ingest_moneypuck_team_games(
    start_season: int,
    end_season: int,
    client: MoneyPuckClient,
) -> MoneyPuckTeamGameIngestionResult:
    """Download once and replace a bounded range of team-game metrics."""
    season_ids = season_ids_in_range(start_season, end_season)
    if season_ids[0] < MONEYPUCK_FIRST_SEASON:
        raise ValueError("MoneyPuck team-game coverage begins with 20082009")
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_moneypuck_team_games",
            status="running",
            parameters={"start_season": start_season, "end_season": end_season},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        fetched = client.fetch_all_team_games()
        normalized = moneypuck_team_game_frame(fetched.content, season_ids)
        with session_scope() as session:
            store_source_artifact(session, run_id, fetched)
            rows_processed = MoneyPuckTeamGameRepository(session).replace(
                season_ids,
                normalized,
            )
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=rows_processed,
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

    return MoneyPuckTeamGameIngestionResult(
        run_id=run_id,
        start_season=start_season,
        end_season=end_season,
        rows_processed=rows_processed,
    )
