import express, { Application } from 'express'
import { existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import cors from 'cors'
import compression from 'compression'
import 'express-async-errors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { memberRouter } from './modules/member'
import { letterRouter } from './modules/letter'
import { adminRouter } from './modules/admin'
// ============================================
// Add your domain module imports here
// ============================================
// Example: Product Module
// import { productRouter } from './modules/product.js'

export const createApp = (): Application => {
  const app = express()

  // HTTP request logging
  app.use(httpLogger)

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )

  // Body parsing and compression
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // 慢信
  app.use(`${env.API_PREFIX}/member`, memberRouter)
  app.use(`${env.API_PREFIX}/letters`, letterRouter)
  app.use(`${env.API_PREFIX}/admin`, adminRouter)

  // ============================================
  // Add your domain module routes here
  // ============================================
  // Example: Product Module
  // app.use(`${env.API_PREFIX}/products`, productRouter)

  // 生产模式：托管前端构建产物（发布时前后端合并到单端口）
  // 从 cwd 向上查找前端构建产物，兼容不同的启动工作目录
  const candidates: string[] = []
  let dir = resolve(process.cwd())
  for (let i = 0; i < 4; i++) {
    candidates.push(join(dir, 'dist-web'), join(dir, 'backend/dist-web'))
    dir = dirname(dir)
  }
  const distDir = candidates.find((d) => existsSync(d)) ?? ''
  if (distDir) {
    app.use(express.static(distDir))
    // SPA fallback：非 /api 路由全部交给前端
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(join(distDir, 'index.html'))
    })
  }

  // Error handling
  app.use(errorHandler)

  return app
}
