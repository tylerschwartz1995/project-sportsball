"""Version-pinned raw artifacts; database storage remains the local default."""

import base64
import hashlib
from dataclasses import dataclass

import boto3
from botocore.exceptions import ClientError

from sportsball.persistence.models import SourceArtifact


@dataclass(frozen=True)
class ObjectReference:
    bucket: str
    key: str
    version_id: str


def store_object(bucket: str, content: bytes, checksum: str) -> ObjectReference:
    """Upload before committing a reference; never overwrite a checksum key."""
    if not bucket:
        raise ValueError("SPORTSBALL_ARTIFACT_S3_BUCKET is required for S3 storage")
    if hashlib.sha256(content).hexdigest() != checksum:
        raise ValueError("artifact checksum does not match its bytes")
    key = f"raw/sha256/{checksum[:2]}/{checksum}"
    expected = base64.b64encode(bytes.fromhex(checksum)).decode("ascii")
    client = boto3.client("s3")
    try:
        result = client.put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ChecksumSHA256=expected,
            Metadata={"sha256": checksum},
            IfNoneMatch="*",
        )
        version = result.get("VersionId")
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") not in ("PreconditionFailed", "412"):
            raise
        existing = client.head_object(Bucket=bucket, Key=key, ChecksumMode="ENABLED")
        if (
            existing.get("ContentLength") != len(content)
            or existing.get("ChecksumSHA256") != expected
        ):
            raise ValueError("existing S3 artifact failed integrity verification") from error
        version = existing.get("VersionId")
    if not version or version == "null":
        raise ValueError("artifact bucket must have S3 versioning enabled")
    return ObjectReference(bucket, key, version)


def read_artifact(artifact: SourceArtifact) -> bytes:
    """Read exactly the recorded version and validate it before returning bytes."""
    if artifact.content is not None:
        content = artifact.content
    else:
        if not artifact.s3_bucket or not artifact.s3_key or not artifact.s3_version_id:
            raise ValueError("artifact has no complete storage reference")
        result = boto3.client("s3").get_object(
            Bucket=artifact.s3_bucket, Key=artifact.s3_key, VersionId=artifact.s3_version_id
        )
        body = result["Body"]
        try:
            content = body.read()
        finally:
            body.close()
    if (
        len(content) != artifact.content_length
        or hashlib.sha256(content).hexdigest() != artifact.checksum
    ):
        raise ValueError("stored artifact failed integrity verification")
    return content
