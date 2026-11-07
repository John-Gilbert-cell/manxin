#!/bin/bash
# 慢信 · 数据备份：把 Postgres 全量导出到 /workspace/backups（保留最近 14 份）
set -u
DIR=/workspace/backups
mkdir -p "$DIR"
STAMP=$(date '+%Y%m%d-%H%M')
FILE="$DIR/manxin-$STAMP.sql"

if docker exec postgres pg_dump -U postgres -d genie --no-owner --no-acl > "$FILE" 2>/tmp/manxin-backup.err; then
  gzip -f "$FILE"
  echo "[$(date '+%F %T')] 备份完成 $FILE.gz" >> "$DIR/backup.log"
  ls -1t "$DIR"/manxin-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
else
  rm -f "$FILE"
  echo "[$(date '+%F %T')] 备份失败: $(cat /tmp/manxin-backup.err)" >> "$DIR/backup.log"
  exit 1
fi
