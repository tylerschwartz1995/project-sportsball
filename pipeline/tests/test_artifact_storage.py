"""Storage failure, integrity, and provenance boundaries without an AWS account."""

import base64
import hashlib
import io
import os
import uuid
from typing import TYPE_CHECKING

import boto3
import pytest
from botocore.response import StreamingBody
from botocore.stub import Stubber
from sqlalchemy import delete, select

from sportsball.clients.moneypuck.client import MoneyPuckCsvFetch
from sportsball.config import settings
from sportsball.persistence import artifact_storage
from sportsball.persistence.artifact_storage import ObjectReference, read_artifact, store_object
from sportsball.persistence.database import session_scope
from sportsball.persistence.models import IngestionRun, SourceArtifact
from sportsball.persistence.repositories import source_artifacts

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client

CONTENT = b"source,data\n1,2\n"
CHECKSUM = hashlib.sha256(CONTENT).hexdigest()
KEY = f"raw/sha256/{CHECKSUM[:2]}/{CHECKSUM}"
ENCODED = base64.b64encode(bytes.fromhex(CHECKSUM)).decode()


def client() -> "S3Client":
    return boto3.client(
        "s3", region_name="us-east-1", aws_access_key_id="test", aws_secret_access_key="test"
    )


def artifact() -> SourceArtifact:
    return SourceArtifact(
        provider="moneypuck",
        resource_type="test",
        source_key="test",
        source_url="https://example.com",
        checksum=CHECKSUM,
        content_length=len(CONTENT),
        content=None,
        s3_bucket="test-bucket",
        s3_key=KEY,
        s3_version_id="version-1",
    )


def test_upload_is_checksum_addressed_and_version_pinned(monkeypatch: pytest.MonkeyPatch) -> None:
    s3 = client()
    with Stubber(s3) as stub:
        stub.add_response(
            "put_object",
            {"VersionId": "version-1"},
            {
                "Bucket": "test-bucket",
                "Key": KEY,
                "Body": CONTENT,
                "ChecksumSHA256": ENCODED,
                "Metadata": {"sha256": CHECKSUM},
                "IfNoneMatch": "*",
            },
        )
        monkeypatch.setattr(artifact_storage.boto3, "client", lambda *_a, **_k: s3)
        assert store_object("test-bucket", CONTENT, CHECKSUM) == ObjectReference(
            "test-bucket", KEY, "version-1"
        )
        stub.assert_no_pending_responses()


@pytest.mark.parametrize("valid", [True, False])
def test_conditional_duplicate_verifies_existing_object(
    monkeypatch: pytest.MonkeyPatch, valid: bool
) -> None:
    s3 = client()
    with Stubber(s3) as stub:
        stub.add_client_error(
            "put_object", service_error_code="PreconditionFailed", http_status_code=412
        )
        stub.add_response(
            "head_object",
            {
                "ContentLength": len(CONTENT),
                "ChecksumSHA256": ENCODED if valid else "wrong",
                "VersionId": "old-version",
            },
            {"Bucket": "test-bucket", "Key": KEY, "ChecksumMode": "ENABLED"},
        )
        monkeypatch.setattr(artifact_storage.boto3, "client", lambda *_a, **_k: s3)
        if valid:
            assert store_object("test-bucket", CONTENT, CHECKSUM).version_id == "old-version"
        else:
            with pytest.raises(ValueError, match="integrity"):
                store_object("test-bucket", CONTENT, CHECKSUM)


def test_rejects_unversioned_bucket_and_corrupt_upload(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(ValueError, match="checksum"):
        store_object("test-bucket", b"wrong", CHECKSUM)
    s3 = client()
    with Stubber(s3) as stub:
        stub.add_response("put_object", {})
        monkeypatch.setattr(artifact_storage.boto3, "client", lambda *_a, **_k: s3)
        with pytest.raises(ValueError, match="versioning"):
            store_object("test-bucket", CONTENT, CHECKSUM)


@pytest.mark.parametrize("content", [CONTENT, b"corrupt"])
def test_reads_recorded_version_and_checks_integrity(
    monkeypatch: pytest.MonkeyPatch, content: bytes
) -> None:
    s3 = client()
    with Stubber(s3) as stub:
        stub.add_response(
            "get_object",
            {"Body": StreamingBody(io.BytesIO(content), len(content))},
            {
                "Bucket": "test-bucket",
                "Key": KEY,
                "VersionId": "version-1",
            },
        )
        monkeypatch.setattr(artifact_storage.boto3, "client", lambda *_a, **_k: s3)
        if content == CONTENT:
            assert read_artifact(artifact()) == CONTENT
        else:
            with pytest.raises(ValueError, match="integrity"):
                read_artifact(artifact())


def test_existing_inline_content_remains_readable() -> None:
    row = artifact()
    row.content = CONTENT
    row.s3_bucket = row.s3_key = row.s3_version_id = None
    assert read_artifact(row) == CONTENT


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1", reason="isolated database required"
)
def test_s3_replay_preserves_first_provenance_and_failed_upload_has_no_reference(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run_id = uuid.uuid4()
    source = MoneyPuckCsvFetch(
        "test", f"test:{run_id}", "https://example.com", "text/csv", CONTENT, CHECKSUM
    )
    calls = 0

    def upload(_bucket: str, _content: bytes, _checksum: str) -> ObjectReference:
        nonlocal calls
        calls += 1
        return ObjectReference("test-bucket", KEY, "version-1")

    monkeypatch.setattr(settings, "artifact_backend", "s3")
    monkeypatch.setattr(settings, "artifact_s3_bucket", "test-bucket")
    monkeypatch.setattr(source_artifacts, "store_object", upload)
    try:
        with session_scope() as session:
            session.add(IngestionRun(id=run_id, job_name="test_artifact", status="succeeded"))
            session.flush()
            source_artifacts.store_source_artifact(session, run_id, source)
            source_artifacts.store_source_artifact(session, run_id, source)
        with session_scope() as session:
            row = session.scalar(
                select(SourceArtifact).where(SourceArtifact.source_key == source.source_key)
            )
            assert row is not None
            assert row.content is None and row.s3_version_id == "version-1"
            assert row.ingestion_run_id == run_id and calls == 1

        def fail(*_args: object) -> ObjectReference:
            raise RuntimeError("storage unavailable")

        monkeypatch.setattr(source_artifacts, "store_object", fail)
        changed = MoneyPuckCsvFetch(
            "test",
            source.source_key,
            source.source_url,
            "text/csv",
            b"changed",
            hashlib.sha256(b"changed").hexdigest(),
        )
        with pytest.raises(RuntimeError, match="unavailable"), session_scope() as session:
            source_artifacts.store_source_artifact(session, run_id, changed)
        with session_scope() as session:
            rows = session.scalars(
                select(SourceArtifact).where(SourceArtifact.source_key == source.source_key)
            ).all()
            assert len(rows) == 1 and rows[0].checksum == CHECKSUM
    finally:
        with session_scope() as session:
            session.execute(
                delete(SourceArtifact).where(SourceArtifact.source_key == source.source_key)
            )
            session.execute(delete(IngestionRun).where(IngestionRun.id == run_id))


@pytest.mark.skipif(
    os.getenv("SPORTSBALL_RUN_DATABASE_TESTS") != "1", reason="isolated database required"
)
@pytest.mark.parametrize("storage", ["neither", "both", "incomplete"])
def test_database_rejects_ambiguous_or_missing_artifact_storage(storage: str) -> None:
    from sqlalchemy.exc import IntegrityError

    row = artifact()
    row.ingestion_run_id = uuid.uuid4()
    row.source_key = str(row.ingestion_run_id)
    if storage == "neither":
        row.s3_bucket = row.s3_key = row.s3_version_id = None
    elif storage == "both":
        row.content = CONTENT
    else:
        row.s3_version_id = None
    with (
        pytest.raises(IntegrityError, match="ck_source_artifact_storage"),
        session_scope() as session,
    ):
        session.add(
            IngestionRun(id=row.ingestion_run_id, job_name="test_artifact", status="succeeded")
        )
        session.flush()
        session.add(row)
        session.flush()
