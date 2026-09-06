"""Select source revisions actually observed before a prediction cutoff.

Adapters must populate fetched_at from retained source provenance, never the game
date or a guessed publication time. This conservative policy intentionally excludes
historical backfills from cutoffs preceding their first recorded fetch.
"""

from datetime import datetime

import polars as pl

IDENTITY_COLUMNS = ["entity_id", "observation_id"]
PROVENANCE_COLUMNS = [*IDENTITY_COLUMNS, "event_at", "fetched_at", "source_checksum"]


def observations_as_of(observations: pl.DataFrame, cutoff: datetime) -> pl.DataFrame:
    """Return the latest known revision per entity/observation, before cutoff.

    Extra value columns are preserved, including nulls. An event at the cutoff
    is excluded; a revision fetched exactly at the cutoff is available. Ambiguous
    simultaneous revisions are rejected rather than arbitrarily chosen.
    """
    if cutoff.tzinfo is None or cutoff.utcoffset() is None:
        raise ValueError("cutoff must include a timezone")
    missing = set(PROVENANCE_COLUMNS) - set(observations.columns)
    if missing:
        raise ValueError(f"missing provenance columns: {sorted(missing)}")
    for name in PROVENANCE_COLUMNS:
        if observations[name].null_count():
            raise ValueError(f"{name} must not contain nulls")
    for name in ("event_at", "fetched_at"):
        dtype = observations.schema[name]
        if not isinstance(dtype, pl.Datetime) or dtype.time_zone is None:
            raise ValueError(f"{name} must be a timezone-aware datetime")
    if observations.schema["source_checksum"] != pl.String:
        raise ValueError("source_checksum must be a SHA-256 string")
    if observations.filter(~pl.col("source_checksum").str.contains(r"^[0-9a-f]{64}$")).height:
        raise ValueError("source_checksum must be a SHA-256 string")
    eligible = observations.filter(
        (pl.col("event_at") < cutoff) & (pl.col("fetched_at") <= cutoff)
    ).unique()
    revision_keys = [*IDENTITY_COLUMNS, "fetched_at"]
    if eligible.select(revision_keys).n_unique() != eligible.height:
        raise ValueError("ambiguous revisions share an observation and fetch timestamp")
    return (
        eligible.sort([*IDENTITY_COLUMNS, "fetched_at"])
        .unique(subset=IDENTITY_COLUMNS, keep="last", maintain_order=True)
        .sort(IDENTITY_COLUMNS)
    )
