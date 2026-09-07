#!/usr/bin/env bash
# Provisioning bootstrap only. No database restore, secret, or schedule here.
set -euo pipefail
install -d -m 0700 /opt/sportsball
printf 'PasswordAuthentication no\nPermitRootLogin no\n' > /etc/ssh/sshd_config.d/00-sportsball.conf
sshd -t
systemctl reload ssh
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2
systemctl enable --now docker
# Ubuntu Lightsail includes SSM Agent in some blueprints. Enrollment remains manual.
