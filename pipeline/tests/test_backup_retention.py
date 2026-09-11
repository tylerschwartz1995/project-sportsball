"""Replacement must preserve the previous backup on any verification failure."""

import hashlib
from io import BytesIO
from pathlib import Path
from typing import TYPE_CHECKING, cast
from unittest.mock import MagicMock

import pytest

from sportsball.operations.backup_retention import replace_backup

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


@pytest.mark.parametrize(
    "failure", [None, "upload", "size", "metadata", "bytes", "sidecar", "cleanup"]
)
def test_verified_replacement(tmp_path: Path, failure: str | None) -> None:
    data = b"portable database archive"
    path = tmp_path / "backup.dump"
    path.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    client = MagicMock()
    client.get_paginator.return_value.paginate.return_value = [
        {"Versions": [{"Key": "daily/old.dump", "VersionId": "old"}]},
        {
            "Versions": [
                {"Key": "daily/old.dump", "VersionId": "hidden"},
                {"Key": "daily/old.dump.sha256", "VersionId": "checksum"},
                {"Key": "daily/notes.txt", "VersionId": "unrelated"},
            ],
            "DeleteMarkers": [{"Key": "daily/old.dump", "VersionId": "marker"}],
        },
    ]
    client.head_object.return_value = {
        "VersionId": "new",
        "ContentLength": len(data) + (failure == "size"),
        "Metadata": {"sha256": "wrong" if failure == "metadata" else digest},
    }
    client.get_object.side_effect = [
        {"Body": BytesIO(b"corrupt" if failure == "bytes" else data)},
        {"Body": BytesIO(b"wrong" if failure == "sidecar" else f"{digest}\n".encode())},
    ]
    if failure == "upload":
        client.upload_file.side_effect = RuntimeError("upload failed")
    if failure == "cleanup":
        client.delete_object.side_effect = RuntimeError("cleanup failed")
    if failure:
        with pytest.raises(RuntimeError):
            replace_backup(cast("S3Client", client), "backups", path, digest)
        if failure != "cleanup":
            client.delete_object.assert_not_called()
    else:
        replace_backup(cast("S3Client", client), "backups", path, digest)
        assert [call.kwargs["VersionId"] for call in client.delete_object.call_args_list] == [
            "old",
            "hidden",
            "checksum",
            "marker",
        ]
        client.get_object.assert_any_call(
            Bucket="backups", Key=client.upload_file.call_args.args[2], VersionId="new"
        )
        names = [call[0] for call in client.mock_calls]
        assert names.index("delete_object") > max(
            i for i, name in enumerate(names) if name == "get_object"
        )


def test_inventory_failure_preserves_existing_backup(tmp_path: Path) -> None:
    client = MagicMock()
    client.get_paginator.return_value.paginate.side_effect = RuntimeError("inventory unavailable")
    with pytest.raises(RuntimeError, match="inventory"):
        replace_backup(cast("S3Client", client), "backups", tmp_path / "unused", "unused")
    client.upload_file.assert_not_called()
    client.delete_object.assert_not_called()
