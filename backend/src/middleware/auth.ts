import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import { one } from '../db/pool.js'

const SECRET = process.env.JWT_SECRET || 'manxin-slow-letter-2026'

export interface SessionUser {
  id: number
  nickname: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser
    }
  }
}

export const signToken = (user: SessionUser) =>
  jwt.sign({ id: user.id }, SECRET, { expiresIn: '365d' })

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // 部分代理会剥离 Authorization 头，这里多渠道兜底
    const header = req.headers.authorization || ''
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
    const alt = (req.headers['x-auth-token'] as string) || ''
    const q = (req.query.token as string) || ''
    const cookie = (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('manxin_token='))
    const cookieToken = cookie ? decodeURIComponent(cookie.slice('manxin_token='.length)) : ''
    // X-Auth-Token / query / cookie 是应用自身通道，优先于可能被网关改写的 Authorization
    const token = alt || q || cookieToken || bearer
    if (!token) throw new AppError(401, '请先找回或建立你的身份')

    const payload = jwt.verify(token, SECRET) as { id: number }
    const user = await one<SessionUser>('SELECT id, nickname FROM members WHERE id = $1', [
      payload.id,
    ])
    if (!user) throw new AppError(401, '身份已失效，请用恢复码找回')
    req.user = user
    next()
  } catch (e) {
    if (e instanceof AppError) return next(e)
    next(new AppError(401, '身份已失效，请用恢复码找回'))
  }
}
