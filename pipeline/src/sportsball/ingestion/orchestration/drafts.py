"""Audited ingestion of the complete official NHL draft archive."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from sportsball.clients.nhl.records_client import DraftFetch, NhlRecordsClient
from sportsball.normalization.drafts import NormalizedDraft, draft_selection_frame
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourcePayload
from sportsball.persistence.repositories.drafts import DraftSelectionRepository

FIRST_NHL_DRAFT_YEAR = 1963


@dataclass(frozen=True)
class DraftIngestionResult:
    """Summary of one completed official draft range ingestion."""

    run_id: uuid.UUID
    start_year: int
    end_year: int
    drafts_processed: int
    selections_processed: int


def ingest_draft_history(
    start_year: int,
    end_year: int,
    client: NhlRecordsClient,
    *,
    on_draft_complete: Callable[[int], None] | None = None,
) -> DraftIngestionResult:
    """Fetch, audit, and transactionally replace an inclusive draft range."""
    draft_years = _draft_years_in_range(start_year, end_year)
    run_id = _start_run(start_year, end_year)
    drafts: list[NormalizedDraft] = []
    payloads: list[tuple[int, DraftFetch]] = []

    try:
        for draft_year in draft_years:
            fetched = client.fetch_draft(draft_year)
            drafts.append(draft_selection_frame(fetched.rows, draft_year))
            payloads.append((draft_year, fetched))
            if on_draft_complete is not None:
                on_draft_complete(draft_year)

        with session_scope() as session:
            source_insert = insert(SourcePayload)
            for draft_year, fetched in payloads:
                session.execute(
                    source_insert.values(
                        ingestion_run_id=run_id,
                        provider="nhl_records",
                        resource_type="draft_selection",
                        source_key=str(draft_year),
                        checksum=fetched.checksum,
                        payload=fetched.payload,
                    ).on_conflict_do_nothing(
                        constraint="uq_source_payload_identity",
                    )
                )
            selections_processed = DraftSelectionRepository(session).replace(drafts)
            session.execute(
                update(IngestionRun)
                .where(IngestionRun.id == run_id)
                .values(
                    status="succeeded",
                    records_processed=selections_processed,
                    finished_at=datetime.now(UTC),
                )
            )
    except Exception as error:
        _fail_run(run_id, error)
        raise

    return DraftIngestionResult(
        run_id=run_id,
        start_year=start_year,
        end_year=end_year,
        drafts_processed=len(draft_years),
        selections_processed=selections_processed,
    )


def _draft_years_in_range(start_year: int, end_year: int) -> list[int]:
    if start_year < FIRST_NHL_DRAFT_YEAR:
        raise ValueError(f"NHL draft history begins in {FIRST_NHL_DRAFT_YEAR}")
    if end_year < start_year:
        raise ValueError("end draft year must not precede start draft year")
    return list(range(start_year, end_year + 1))


def _start_run(start_year: int, end_year: int) -> uuid.UUID:
    with session_scope() as session:
        run = IngestionRun(
            job_name="ingest_draft_history",
            status="running",
            parameters={"start_year": start_year, "end_year": end_year},
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
