#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "usage: $0 BACKUP_PATH" >&2
  exit 2
fi

backup_path="$1"
database_user="${POSTGRES_USER:-sportsball}"
timestamp="$(date -u +%Y%m%d%H%M%S)"
restore_database="sportsball_restore_check_${timestamp}_$$"

if [[ ! -f "${backup_path}" ]]; then
  echo "backup does not exist: ${backup_path}" >&2
  exit 2
fi

checksum_path="${backup_path}.sha256"
if [[ -f "${checksum_path}" ]]; then
  backup_directory="$(dirname "${backup_path}")"
  checksum_filename="$(basename "${checksum_path}")"
  (
    cd "${backup_directory}"
    shasum -a 256 --check "${checksum_filename}"
  )
fi

cleanup_database() {
  docker compose exec -T postgres dropdb \
    --username "${database_user}" \
    --if-exists \
    "${restore_database}" >/dev/null
}
trap cleanup_database EXIT

docker compose exec -T postgres createdb \
  --username "${database_user}" \
  "${restore_database}"

docker compose exec -T postgres pg_restore \
  --username "${database_user}" \
  --dbname "${restore_database}" \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  <"${backup_path}"

verification="$(
  docker compose exec -T postgres psql \
    --username "${database_user}" \
    --dbname "${restore_database}" \
    --tuples-only \
    --no-align \
    --command "
      SELECT
        (SELECT version_num FROM alembic_version),
        (SELECT count(*) FROM seasons),
        (SELECT count(*) FROM games),
        (SELECT count(*) FROM ingestion_runs);
    "
)"

echo "restore_database=${restore_database}"
echo "alembic_version,seasons,games,ingestion_runs=${verification}"
echo "verification=passed"
