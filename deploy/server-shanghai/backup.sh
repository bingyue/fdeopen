#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/fdeopen/current
backup_dir="/var/backups/fdeopen/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
dc() {
  docker compose --env-file /etc/fdeopen/server.env \
    -f deploy/server-shanghai/compose.yaml "$@"
}
dc exec -T postgres pg_dump -U fdeopen -d fdeopen -Fc > "$backup_dir/database.dump"
dc exec -T web tar -C /app/.data/uploads -czf - . > "$backup_dir/uploads.tar.gz"
dc exec -T postgres pg_restore --list < "$backup_dir/database.dump" > "$backup_dir/database-manifest.txt"
tar -tzf "$backup_dir/uploads.tar.gz" > "$backup_dir/uploads-manifest.txt"
(cd "$backup_dir" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
printf 'Backup completed: %s\n' "$backup_dir"
