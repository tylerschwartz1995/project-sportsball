#!/usr/bin/env bash
# Local packaging only: this script never uploads, provisions, or deploys anything.
set -euo pipefail
revision=${1:?Pass the reviewed full Git commit SHA}
output_dir=${2:?Pass an output directory outside the repository}
[[ $revision =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected a full commit SHA' >&2; exit 1; }
git cat-file -e "$revision^{commit}"
mkdir -p "$output_dir"
git archive --format=zip --output="$output_dir/$revision.zip" "$revision"
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
git archive "$revision" | tar -xf - -C "$staging"
# Build off-server for the Lightsail x86 instance, not the local Mac architecture.
docker build --platform linux/amd64 -f "$staging/infra/runtime/Dockerfile.web" -t "sportsball-web:$revision" "$staging"
docker save "sportsball-web:$revision" | gzip > "$output_dir/web-$revision.tar.gz"
shasum -a 256 "$output_dir/$revision.zip" "$output_dir/web-$revision.tar.gz"
