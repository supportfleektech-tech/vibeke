#!/bin/bash
set -e
DATE=$(date +%F-%H%M)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/kinara-$DATE.sql.gz"
echo "→ Backing up kinara_db to $FILE"
if docker ps | grep -q kinara_db; then
  docker exec kinara_db pg_dump -U postgres kinara_db | gzip > "$FILE"
else
  docker exec autonomous-seo-intelligence-platformsonnet-db-1 pg_dump -U postgres kinara_db | gzip > "$FILE" || pg_dump "$DATABASE_URL" | gzip > "$FILE"
fi
echo "✓ Backup $FILE ($(du -h "$FILE" | cut -f1))"
echo "→ Keep 7 days: find $BACKUP_DIR -mtime +7 -delete"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
ls -lh "$BACKUP_DIR" | tail -5
