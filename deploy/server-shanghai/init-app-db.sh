#!/usr/bin/env bash
set -euo pipefail
# Use independent, generated hex secrets. The web process never receives the cluster admin password.
if [[ ! "${APP_DATABASE_PASSWORD:-}" =~ ^[a-f0-9]{64}$ ]]; then
  printf 'APP_DATABASE_PASSWORD must be 64 random hex characters.\n' >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE fdeopen_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '$APP_DATABASE_PASSWORD';
ALTER DATABASE fdeopen OWNER TO fdeopen_app;
ALTER SCHEMA public OWNER TO fdeopen_app;
SQL
