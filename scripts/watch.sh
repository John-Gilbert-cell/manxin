#!/bin/bash
# 常驻巡检：每 20 秒健康检查一次；每天自动备份一次数据库
while true; do
  /workspace/scripts/guard.sh

  # 每天 04:10 备份（按日期判断，避免重复）
  TODAY=$(date '+%Y%m%d')
  if [ "$(date '+%H%M')" -ge 410 ] && [ "$TODAY" != "$(cat /tmp/manxin-last-backup 2>/dev/null)" ]; then
    /workspace/scripts/backup.sh && echo "$TODAY" > /tmp/manxin-last-backup
  fi

  sleep 20
done
