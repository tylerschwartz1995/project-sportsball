"""Replace the hosted backup only after verifying its uploaded bytes.

The historical daily/ prefix is preserved for existing backups and IAM scopes.
Callers must serialize writers (the hosted workflow has a concurrency group).
"""

import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import uuid4

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


def replace_backup(client: "S3Client", bucket: str, path: Path, digest: str) -> None:
    # Finish pagination before uploading or deleting. Include hidden versions and
    # delete markers; ordinary S3 deletion would only hide the stored bytes.
    previous: list[tuple[str, str]] = []
    for page in client.get_paginator("list_object_versions").paginate(
        Bucket=bucket, Prefix="daily/"
    ):
        for entry in [*page.get("Versions", []), *page.get("DeleteMarkers", [])]:
            key, version = entry.get("Key", ""), entry.get("VersionId", "")
            if key.startswith("daily/") and key.endswith((".dump", ".dump.sha256")):
                if not version:
                    raise RuntimeError("backup version inventory is incomplete")
                previous.append((key, version))

    key = f"daily/{datetime.now(UTC):%Y/%m/%d/%H%M%S}-{uuid4().hex}-{digest}.dump"
    client.upload_file(str(path), bucket, key, ExtraArgs={"Metadata": {"sha256": digest}})
    client.put_object(Bucket=bucket, Key=f"{key}.sha256", Body=f"{digest}\n".encode())
    head = client.head_object(Bucket=bucket, Key=key)
    version = head.get("VersionId")
    if not version or head.get("ContentLength") != path.stat().st_size:
        raise RuntimeError("uploaded backup version or size did not match")
    if head.get("Metadata", {}).get("sha256") != digest:
        raise RuntimeError("uploaded backup checksum metadata did not match")
    response = client.get_object(Bucket=bucket, Key=key, VersionId=version)
    body = response["Body"]
    try:
        downloaded = hashlib.sha256()
        while chunk := body.read(8 * 1024 * 1024):
            downloaded.update(chunk)
        actual = downloaded.hexdigest()
    finally:
        body.close()
    if actual != digest:
        raise RuntimeError("uploaded backup bytes failed checksum verification")
    sidecar = client.get_object(Bucket=bucket, Key=f"{key}.sha256")["Body"]
    try:
        if sidecar.read() != f"{digest}\n".encode():
            raise RuntimeError("uploaded backup checksum sidecar did not match")
    finally:
        sidecar.close()

    # No old copy is touched before every verification above passes. Failed
    # candidates are also removed on the next successful replacement. Errors
    # propagate: a partial cleanup must not report successful single-copy retention.
    for old_key, old_version in previous:
        client.delete_object(Bucket=bucket, Key=old_key, VersionId=old_version)
    print("backup uploaded and downloaded checksum verified; one backup retained")
