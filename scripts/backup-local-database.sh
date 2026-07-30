#!/usr/bin/env bash

set -euo pipefail

backup_directory="${1:-backups}"
database_name="${POSTGRES_DB:-sportsball}"
database_user="${POSTGRES_USER:-sportsball}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="${backup_directory}/sportsball-${timestamp}.dump"
temporary_path="${backup_path}.partial"
checksum_path="${backup_path}.sha256"
backup_filename="$(basename "${backup_path}")"

mkdir -p "${backup_directory}"

cleanup_partial() {
  rm -f "${temporary_path}"
}
trap cleanup_partial EXIT

docker compose exec -T postgres pg_dump \
  --username "${database_user}" \
  --dbname "${database_name}" \
  --format=custom \
  --compress=zstd:6 \
  --no-owner \
  --no-privileges \
  >"${temporary_path}"

docker compose exec -T postgres pg_restore --list <"${temporary_path}" >/dev/null
mv "${temporary_path}" "${backup_path}"
(
  cd "${backup_directory}"
  shasum -a 256 "${backup_filename}" >"${backup_filename}.sha256"
)
trap - EXIT

echo "backup=${backup_path}"
echo "checksum=${checksum_path}"
