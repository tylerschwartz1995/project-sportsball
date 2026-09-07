#!/usr/bin/env bash
# Local/CI smoke check; synthetic credentials and no database or AWS access.
set -euo pipefail
image=${1:?Pass the locally built web image}
prefix="sportsball-runtime-test-$$"
cleanup() {
  docker rm -f "$prefix-proxy" "$prefix-web" >/dev/null 2>&1 || true
  docker network rm "$prefix" >/dev/null 2>&1 || true
}
trap cleanup EXIT
docker network create "$prefix" >/dev/null
docker run -d --name "$prefix-web" --network "$prefix" --network-alias web "$image" >/dev/null
# Bcrypt for the public test-only password 'local-preparation-test'.
hash='$2a$14$HfmVkTvgN7bVOyhucZ8UZOs.LPhvhqF.OWveNsSSO1C/VYtVWLbTy'
docker create --name "$prefix-proxy" --network "$prefix" -p 127.0.0.1::80 \
  -e SPORTSBALL_DOMAIN=:80 -e SPORTSBALL_USER_ONE=test-one -e SPORTSBALL_USER_TWO=test-two \
  -e "SPORTSBALL_PASSWORD_HASH_ONE=$hash" -e "SPORTSBALL_PASSWORD_HASH_TWO=$hash" \
  caddy:2-alpine >/dev/null
docker cp infra/runtime/Caddyfile "$prefix-proxy:/etc/caddy/Caddyfile"
docker start "$prefix-proxy" >/dev/null
port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' "$prefix-proxy")
base="http://127.0.0.1:$port"
for attempt in {1..30}; do
  if curl --silent --output /dev/null "$base/favicon.ico"; then break; fi
  sleep 1
done
for path in / /teams /api/health /favicon.ico; do
  status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$base$path")
  [[ $status == 401 ]] || { echo "Unauthenticated $path returned $status" >&2; exit 1; }
done
for user in test-one test-two; do
  status=$(curl --silent --show-error --user "$user:local-preparation-test" --output /dev/null --write-out '%{http_code}' "$base/favicon.ico")
  [[ $status == 200 ]] || { echo "Authenticated static asset returned $status" >&2; exit 1; }
done
status=$(curl --silent --show-error --user test-one:wrong --output /dev/null --write-out '%{http_code}' "$base/favicon.ico")
[[ $status == 401 ]] || { echo "Wrong password returned $status" >&2; exit 1; }
echo 'Runtime passed: unauthenticated routes blocked, both accounts accepted, wrong password rejected.'
