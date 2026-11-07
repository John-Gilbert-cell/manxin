import { Router } from 'express'
import { z } from 'zod'
import { query, one } from '../db/pool.js'
import { AppError } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { generateRecoverCode, normalizeCode } from '../lib/recover.js'
import { signToken } from '../middleware/auth.js'
import { ensureInPool, tryMatch } from '../lib/match.js'


export const memberRouter = Router()

export const MOODS = ['累', '想被听见', '深夜不睡', '想家', '中年沉默', '刚挂了电话']

const memberCols = `id, nickname, recover_code as "recoverCode", code_hint as "codeHint",
  moods, is_test as "isTest", created_at as "createdAt"`

/** 建立身份：昵称 + 3 个情绪标签 → 生成恢复码 */
memberRouter.post('/register', async (req, res) => {
  const data = z
    .object({
      nickname: z.string().trim().min(1, '先留一个昵称').max(12, '昵称最多 12 个字'),
      moods: z
        .array(z.string())
        .length(3, '选 3 个标签就好，不多不少')
        .refine((arr) => arr.every((m) => MOODS.includes(m)), {
          message: '只能从给出的标签里选',
        }),
    })
    .parse(req.body)

  const exists = await one('SELECT 1 FROM members WHERE lower(nickname) = lower($1)', [data.nickname])
  if (exists) throw new AppError(409, '这个昵称已经有人用了，换一个吧')

  let code = generateRecoverCode()
  for (let i = 0; i < 5; i++) {
    const dup = await one('SELECT 1 FROM members WHERE recover_code = $1', [code])
    if (!dup) break
    code = generateRecoverCode()
  }

  const member = await one(
    `INSERT INTO members (nickname, recover_code, code_hint, moods, is_test)
     VALUES ($1,$2,$3,$4,TRUE) RETURNING ${memberCols}`,
    [data.nickname, code, code.slice(0, 4), data.moods]
  )

  await ensureInPool(member!.id)
  const match = await tryMatch(member!.id)

  res.status(201).json({
    token: signToken({ id: member!.id, nickname: member!.nickname }),
    member,
    matched: match.matched,
    peerNickname: match.peer?.nickname ?? null,
  })
})

/** 用恢复码找回身份 */
memberRouter.post('/recover', async (req, res) => {
  const { code } = z.object({ code: z.string().min(1, '请填写恢复码') }).parse(req.body)
  const normalized = normalizeCode(code)
  const member = await one(`SELECT ${memberCols} FROM members WHERE recover_code = $1`, [
    normalized,
  ])
  if (!member) throw new AppError(404, '没有找到这个恢复码，检查一下有没有抄漏')

  await query('UPDATE members SET last_seen_at = now() WHERE id = $1', [member.id])
  res.json({ token: signToken({ id: member.id, nickname: member.nickname }), member })
})

memberRouter.get('/me', requireAuth, async (req, res) => {
  const member = await one(`SELECT ${memberCols} FROM members WHERE id = $1`, [req.user!.id])
  if (!member) throw new AppError(404, '身份不存在')
  await query('UPDATE members SET last_seen_at = now() WHERE id = $1', [req.user!.id])
  await tryMatch(req.user!.id)
  await ensureInPool(req.user!.id)

  const counts = await one<any>(
    `SELECT
      (SELECT count(*)::int FROM letters WHERE recipient_id = $1 AND status = 'in_transit') as "inTransit",
      (SELECT count(*)::int FROM letters WHERE recipient_id = $1 AND status = 'delivered') as "deliverable",
      (SELECT count(*)::int FROM letters WHERE recipient_id = $1 AND status = 'read') as "read",
      (SELECT count(*)::int FROM letters WHERE sender_id = $1) as "sent"`,
    [req.user!.id]
  )
  res.json({ ...member, counts })
})
