"""Materialize NHL-published player seasons from retained profile payloads."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update

from sportsball.clients.nhl.schemas import PlayerProfileResponse
from sportsball.ingestion.orchestration.multi_season_backfill import season_ids_in_range
from sportsball.normalization.official_player_seasons import (
    official_player_season_frames,
)
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.official_player_seasons import (
    OfficialPlayerSeasonRepository,
)


@dataclass(frozen=True)
class OfficialPlayerSeasonBuildResult:
    """Summary of one official player-season materialization."""

    run_id: uuid.UUID
    start_season: int
    end_season: int
    skaters_processed: int
    goalies_processed: int

    @property
    def records_processed(self) -> int:
        """Return all official team-split rows written."""
        return self.skaters_processed + self.goalies_processed


def build_official_player_seasons(
    start_season: int,
    end_season: int,
) -> OfficialPlayerSeasonBuildResult:
    """Normalize retained NHL profile season totals for an inclusive range."""
    season_ids = season_ids_in_range(start_season, end_season)
    with session_scope() as session:
        run = IngestionRun(
            job_name="build_official_player_seasons",
            status="running",
            parameters={"start_season": start_season, "end_season": end_season},
        )
        session.add(run)
        session.flush()
        run_id = run.id

    try:
        profiles = _latest_profiles()
        normalized = official_player_season_frames(profiles, season_ids)
        with session_scope() as session:
            skaters_processed, goalies_processed = OfficialPlayerSeasonRepository(session).replace(
                season_ids,
                skaters=normalized.skaters,
                goalies=normalized.goalies,
            )
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=skaters_processed + goalies_processed,
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

    return OfficialPlayerSeasonBuildResult(
        run_id=run_id,
        start_season=start_season,
        end_season=end_season,
        skaters_processed=skaters_processed,
        goalies_processed=goalies_processed,
    )


def _latest_profiles() -> list[PlayerProfileResponse]:
    with session_scope() as session:
        payload_rows: list[tuple[str, dict[str, Any]]] = [
            (source_key, payload)
            for source_key, payload in session.execute(
                select(SourcePayload.source_key, SourcePayload.payload)
                .where(SourcePayload.resource_type == "player_profile")
                .order_by(SourcePayload.source_key, SourcePayload.fetched_at.desc())
            ).tuples()
        ]
    latest: dict[str, dict[str, Any]] = {}
    for source_key, payload in payload_rows:
        latest.setdefault(source_key, payload)
    profiles = [PlayerProfileResponse.model_validate(payload) for payload in latest.values()]
    mismatches = [
        (source_key, profile.player_id)
        for source_key, profile in zip(latest, profiles, strict=True)
        if source_key != str(profile.player_id)
    ]
    if mismatches:
        raise ValueError(f"profile source keys do not match payloads: {mismatches[:10]}")
    return profiles
