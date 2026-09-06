"""Build and retain immutable, provenance-bearing observation snapshots."""

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import polars as pl

from sportsball.features.point_in_time import observations_as_of


@dataclass(frozen=True)
class DatasetManifest:
    """Identity, availability policy, and content digest of one observation dataset."""

    dataset_name: str
    dataset_version: str
    prediction_target: str
    feature_set_name: str
    feature_set_version: str
    run_id: str
    code_revision: str
    cutoff: str
    window_start: str
    row_count: int
    source_checksums: tuple[str, ...]
    columns: tuple[tuple[str, str], ...]
    content_sha256: str
    availability_policy: str = "recorded-fetch-v1"
    manifest_version: int = 1


@dataclass(frozen=True)
class DatasetSnapshot:
    """An exact serialized dataset paired with its manifest."""

    manifest: DatasetManifest
    content: bytes

    def write(self, directory: Path) -> None:
        """Create a new snapshot directory; never overwrite an existing artifact."""
        from dataclasses import asdict

        if hashlib.sha256(self.content).hexdigest() != self.manifest.content_sha256:
            raise ValueError("snapshot content does not match its manifest")
        directory.mkdir(parents=True, exist_ok=False)
        (directory / "observations.json").write_bytes(self.content)
        (directory / "manifest.json").write_text(
            json.dumps(asdict(self.manifest), indent=2, sort_keys=True) + "\n"
        )


def build_snapshot(
    observations: pl.DataFrame,
    *,
    dataset_name: str,
    dataset_version: str,
    prediction_target: str,
    feature_set_name: str,
    feature_set_version: str,
    run_id: str,
    code_revision: str,
    cutoff: datetime,
    window_start: datetime,
) -> DatasetSnapshot:
    """Freeze a bounded input dataset; no target, model, or evaluation is inferred.

    Callers provide revisions with explicit provenance. This function does not
    turn the latest normalized tables into historical observations or assign
    historical availability to source files fetched during a later backfill.
    """
    labels = (
        dataset_name,
        dataset_version,
        prediction_target,
        feature_set_name,
        feature_set_version,
        run_id,
    )
    if any(not label.strip() for label in labels):
        raise ValueError("dataset, feature, target, and run identities must be nonempty")
    if not re.fullmatch(r"[0-9a-f]{40}", code_revision):
        raise ValueError("code_revision must be a full Git commit SHA")
    if window_start.tzinfo is None or window_start.utcoffset() is None:
        raise ValueError("window_start must include a timezone")
    selected = observations_as_of(observations, cutoff)
    if window_start >= cutoff:
        raise ValueError("window_start must precede cutoff")
    selected = selected.filter(pl.col("event_at") >= window_start)
    # Normalize timestamp representation and column order for stable serialization.
    selected = selected.with_columns(
        pl.col("event_at", "fetched_at").dt.convert_time_zone("UTC").dt.cast_time_unit("us")
    ).select(sorted(selected.columns))
    content = selected.write_json().encode("utf-8")
    manifest = DatasetManifest(
        dataset_name=dataset_name,
        dataset_version=dataset_version,
        prediction_target=prediction_target,
        feature_set_name=feature_set_name,
        feature_set_version=feature_set_version,
        run_id=run_id,
        code_revision=code_revision,
        cutoff=cutoff.astimezone(UTC).isoformat(),
        window_start=window_start.astimezone(UTC).isoformat(),
        row_count=selected.height,
        source_checksums=tuple(sorted(selected["source_checksum"].unique().to_list())),
        columns=tuple((name, str(dtype)) for name, dtype in selected.schema.items()),
        content_sha256=hashlib.sha256(content).hexdigest(),
    )
    return DatasetSnapshot(manifest=manifest, content=content)
