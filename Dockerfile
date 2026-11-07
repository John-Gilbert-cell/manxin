# 慢信 · 单容器部署（Node 后端 + 前端静态托管）
# 适用于 Render / Railway / Fly / 任意支持 Docker 的平台
# 数据库使用外部 PostgreSQL（通过 DATABASE_URL 注入），不放在容器内
FROM node:22-slim

WORKDIR /app

# 1) 前端依赖（含 devDependencies，构建需要 tsc/vite）
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && (npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund)

# 2) 后端依赖（tsx 在 devDependencies，运行时也需要）
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && (npm ci --include=dev --no-audit --no-fund || npm install --include=dev --no-audit --no-fund)

# 3) 源码
COPY . .

# 4) 构建前端，产物交给后端静态托管
RUN cd frontend && npm run build && rm -rf /app/backend/dist-web && cp -r dist /app/backend/dist-web

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 启动（tsx 直接跑 TS，启动时自动执行幂等建表）
CMD ["sh", "-c", "cd /app/backend && npx tsx src/index.ts"]
