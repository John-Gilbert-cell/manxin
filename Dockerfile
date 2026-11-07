# 慢信 · 单容器部署（Node 后端 + 前端静态托管）
# 适用于 Render / Railway / Fly / 任意支持 Docker 的平台
# 数据库使用外部 PostgreSQL（通过 DATABASE_URL 注入），不放在容器内
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

# 1) 前端依赖
COPY frontend/package.json frontend/pnpm-lock.yaml* ./frontend/
RUN cd frontend && (pnpm install --frozen-lockfile || pnpm install)

# 2) 后端依赖
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && (npm ci || npm install)

# 3) 源码
COPY . .

# 4) 构建前端，产物交给后端静态托管
RUN cd frontend && pnpm build && rm -rf /app/backend/dist-web && cp -r dist /app/backend/dist-web

EXPOSE 3000
ENV PORT=3000

# 启动（tsx 直接跑 TS，启动时自动执行幂等建表）
CMD ["sh", "-c", "cd /app/backend && npx tsx src/index.ts"]
