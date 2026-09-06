"""Leakage, provenance, and reproducibility checks for future feature inputs."""

import hashlib
from datetime import UTC, datetime
from pathlib import Path

import polars as pl
import pytest

from sportsball.datasets.snapshot import build_snapshot
from sportsball.features.point_in_time import observations_as_of


def instant(day: int) -> datetime:
    return datetime(2026, 1, day, tzinfo=UTC)


def observations() -> pl.DataFrame:
    return pl.DataFrame(
        {
            "entity_id": [1, 1, 1, 2],
            "observation_id": [10, 10, 11, 20],
            "event_at": [instant(1), instant(1), instant(4), instant(1)],
            "fetched_at": [instant(2), instant(5), instant(4), instant(10)],
            "source_checksum": ["a" * 64, "b" * 64, "c" * 64, "d" * 64],
            "goals": [1, 2, 3, None],
        }
    )


def test_excludes_later_corrections_future_events_and_historical_backfills() -> None:
    selected = observations_as_of(observations(), instant(4))
    assert selected["goals"].to_list() == [1]
    assert observations_as_of(observations(), instant(6))["goals"].to_list() == [2, 3]
    assert observations_as_of(observations(), instant(11))["goals"].to_list() == [2, 3, None]


def test_includes_fetch_at_cutoff_and_preserves_empty_schema() -> None:
    assert observations_as_of(observations(), instant(2))["goals"].to_list() == [1]
    assert observations_as_of(observations(), instant(1)).schema == observations().schema


def test_rejects_missing_provenance_and_naive_times() -> None:
    with pytest.raises(ValueError, match="timezone"):
        observations_as_of(observations(), datetime(2026, 1, 4))
    with pytest.raises(ValueError, match="missing provenance"):
        observations_as_of(observations().drop("fetched_at"), instant(4))
    with pytest.raises(ValueError, match="timezone-aware"):
        observations_as_of(
            observations().with_columns(pl.col("event_at").dt.replace_time_zone(None)), instant(4)
        )
    with pytest.raises(ValueError, match="nulls"):
        observations_as_of(
            observations().with_columns(pl.lit(None).alias("fetched_at")), instant(4)
        )


def test_rejects_ambiguous_revisions_but_deduplicates_identical_rows() -> None:
    row = observations().head(1)
    assert observations_as_of(pl.concat([row, row]), instant(4)).height == 1
    conflicting = row.with_columns(pl.lit(9, dtype=pl.Int64).alias("goals"))
    with pytest.raises(ValueError, match="ambiguous"):
        observations_as_of(pl.concat([row, conflicting]), instant(4))


def test_snapshot_has_stable_content_and_immutable_output(tmp_path: Path) -> None:
    first = build_snapshot(
        observations(),
        dataset_name="test-inputs",
        dataset_version="1",
        prediction_target="test-target",
        feature_set_name="test-features",
        feature_set_version="1",
        run_id="run-1",
        code_revision="e" * 40,
        cutoff=instant(6),
        window_start=instant(1),
    )
    shuffled = build_snapshot(
        observations().reverse(),
        dataset_name="test-inputs",
        dataset_version="1",
        prediction_target="test-target",
        feature_set_name="test-features",
        feature_set_version="1",
        run_id="run-2",
        code_revision="e" * 40,
        cutoff=instant(6),
        window_start=instant(1),
    )
    assert first.content == shuffled.content
    assert first.manifest.content_sha256 == hashlib.sha256(first.content).hexdigest()
    assert first.manifest.source_checksums == ("b" * 64, "c" * 64)
    assert first.manifest.availability_policy == "recorded-fetch-v1"
    directory = tmp_path / "snapshot"
    first.write(directory)
    assert (directory / "manifest.json").is_file()
    with pytest.raises(FileExistsError):
        shuffled.write(directory)
    assert (directory / "observations.json").read_bytes() == first.content


def test_snapshot_applies_window_and_requires_versioned_code() -> None:
    with pytest.raises(ValueError, match="Git commit"):
        build_snapshot(
            observations(),
            dataset_name="inputs",
            dataset_version="1",
            prediction_target="test",
            feature_set_name="test-features",
            feature_set_version="1",
            run_id="1",
            code_revision="main",
            cutoff=instant(6),
            window_start=instant(1),
        )
    snapshot = build_snapshot(
        observations(),
        dataset_name="inputs",
        dataset_version="1",
        prediction_target="test",
        feature_set_name="test-features",
        feature_set_version="1",
        run_id="1",
        code_revision="a" * 40,
        cutoff=instant(6),
        window_start=instant(3),
    )
    assert snapshot.manifest.row_count == 1
