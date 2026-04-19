#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is required" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_OUTPUT_DIR:-backups}/$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$BACKUP_DIR"

echo "Writing backup into $BACKUP_DIR"

supabase db dump --db-url "$SUPABASE_DB_URL" -f "$BACKUP_DIR/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" --data-only --use-copy -f "$BACKUP_DIR/data.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" --role-only -f "$BACKUP_DIR/roles.sql"

tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"

echo "$BACKUP_DIR.tar.gz"
