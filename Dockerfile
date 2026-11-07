# 慢信 · 单容器部署（Node 后端 + 前端静态托管 + PostgreSQL 同容器版可选）
# Render/Railway/Fly 通用
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends postgresql postgresql-client curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 前端
COPY frontend/package.json frontend/pnpm-lock.yaml* ./frontend/
RUN corepack enable && cd frontend && (pnpm install --frozen-lockfile || pnpm install) || true

# 后端
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && (npm ci || npm install)

COPY . .

# 构建前端
RUN cd frontend && pnpm install && pnpm build && rm -rf node_modules && \
    cp -r dist /app/backend/dist-web

# 初始化数据库脚本
COPY backend/src/db/schema-manxin.sql /app/init.sql

COPY <<'EOF' /app/start.sh
#!/bin/bash
set -e
# 若提供了外部数据库（DATABASE_URL），直接用；否则在容器内起 Postgres
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgres://postgres:manxin@127.0.0.1:5432/manxin"
  chown -R postgres:postgres /var/lib/postgresql || true
  su postgres -c "/usr/lib/postgresql/*/bin/initdb -D /var/lib/postgresql/data" || true
  su postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data -l /tmp/pg.log start -w" || true
  su postgres -c "/usr/lib/postgresql/*/bin/createdb manxin" || true
  su postgres -c "psql manxin < /app/init.sql" || true
fi
cd /app/backend && npx tsx src/index.ts
EOF
RUN chmod +x /app/start.sh

EXPOSE 3000
ENV PORT=3000 JWT_SECRET=manxin-slow-letter-2026 ADMIN_KEY=manxin-admin-2026 RECEIVE_WAIT_SEC=15 TRANSIT_MINUTES=0
CMD ["/app/start.sh"]
