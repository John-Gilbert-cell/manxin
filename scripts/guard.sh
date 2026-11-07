#!/bin/bash
# 慢信 · 自愈守护：确保 Postgres 在线 + 后端单端口（API + 前端静态产物）存活
# 幂等：健康 → 什么都不做；不健康 → 拉起；拉起失败 → 清理端口重试
set -u
cd /workspace/backend || exit 1

LOG=/tmp/manxin-guard.log
HEALTH=http://127.0.0.1:3000/api/health

log() { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG"; }

healthy() {
  curl -sf -m 4 "$HEALTH" >/dev/null 2>&1
}

ensure_db() {
  docker exec postgres pg_isready -U postgres >/dev/null 2>&1 && return 0
  log "Postgres 未就绪，尝试启动"
  docker start postgres >/dev/null 2>&1
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    docker exec postgres pg_isready -U postgres >/dev/null 2>&1 && return 0
    sleep 1
  done
  log "Postgres 仍不可用"
  return 1
}

start_backend() {
  log "启动后端"
  nohup npx tsx src/index.ts >> /tmp/manxin-backend.log 2>&1 &
  for _ in $(seq 1 20); do
    sleep 1
    healthy && { log "后端已就绪"; return 0; }
  done
  return 1
}

if healthy; then
  exit 0
fi

ensure_db || exit 1

if start_backend; then
  exit 0
fi

# 第二轮：端口被僵尸进程占住，清掉再起
log "首次启动失败，清理 3000 端口后重试"
fuser -k 3000/tcp >/dev/null 2>&1
sleep 1
start_backend
