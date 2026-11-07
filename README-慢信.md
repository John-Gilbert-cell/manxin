# 慢信 · 运行说明

## 访问
https://a23565310bec7f1e1.app.workbuddy.host/?sharecode=T4NDYBK7RR

## 数据存储
- PostgreSQL（Docker 容器 `postgres`，库 `genie`）
- 数据落在 Docker named volume，容器重启/沙箱休眠都不会丢
- 每日 04:10 自动全量备份到 `/workspace/backups/`（gzip，保留最近 14 份）
- 手动备份：`bash /workspace/scripts/backup.sh`
- 恢复：`gunzip -c /workspace/backups/manxin-XXXX.sql.gz | docker exec -i postgres psql -U postgres -d genie`

## 规则
- 昵称唯一（不区分大小写，禁止重名）
- 寄信、回信均不设频率限制
- 收信方在信件到达后需等待 `RECEIVE_WAIT_SEC` 秒（当前 15）才能拆开
- 寄出前后台不做撤回；已读状态不对外暴露

## 配置（backend/.env）
- `RECEIVE_WAIT_SEC=15` 收信等待秒数
- `TRANSIT_MINUTES=0` 信鸽飞行时长（0 表示即时到达）

## 运维
- 健康检查：`curl localhost:3000/api/health`
- 守护：`/workspace/scripts/watch.sh` 每 20 秒巡检，后端挂了自动拉起
- 日志：`/tmp/manxin-guard.log`、`/tmp/manxin-backend.log`
