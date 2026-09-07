#!/usr/bin/env bash
set -euo pipefail
# Session Manager plugin is outside Python; verify signed-package provenance during release.
curl --fail --silent --show-error --location \
  https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb \
  --output /tmp/session-manager-plugin.deb
dpkg -i /tmp/session-manager-plugin.deb
if [[ ${JOB_MODE:?} == backup ]]; then
  install -d /usr/share/postgresql-common/pgdg
  curl --fail --silent --show-error https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    --output /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  printf '%s\n' 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main' > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y postgresql-client-18
fi
