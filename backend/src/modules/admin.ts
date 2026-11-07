import { Router } from 'express'
import { z } from 'zod'
import { query, one } from '../db/pool.js'
import { AppError } from '../middleware/errorHandler.js'
import { MOODS, POSTMAN_CODE, RECEIVE_WAIT_SEC } from '../lib/config.js'
import { deliverPendingLettersOf } from '../lib/match.js'

export const adminRouter = Router()

const ADMIN_KEY = process.env.ADMIN_KEY || 'manxin-admin-2026'

const requireAdmin = (req: any, _res: any, next: any) => {
  const key = req.headers['x-admin-key'] || req.query.key
  if (key !== ADMIN_KEY) return next(new AppError(401, '管理口令不对'))
  next()
}

/** 所有成员 + 通信概览，供后台手动配对 */
adminRouter.get('/members', requireAdmin, async (_req, res) => {
  const rows = await query(
    `SELECT m.id, m.nickname, m.moods, m.created_at as "createdAt", m.last_seen_at as "lastSeenAt",
       (SELECT count(*)::int FROM letters l WHERE l.sender_id = m.id) as "sentCount",
       (SELECT count(*)::int FROM letters l WHERE l.recipient_id = m.id) as "receivedCount",
       (SELECT count(*)::int FROM letters l WHERE l.sender_id = m.id AND l.status = 'in_transit') as "inTransit",
       mp.member_id IS NOT NULL as "inPool",
       (SELECT string_agg(pr.nickname, '、') FROM pairs pa
          JOIN members pr ON pr.id = pa.peer_id WHERE pa.member_id = m.id) as "peers"
     FROM members m LEFT JOIN match_pool mp ON mp.member_id = m.id
     WHERE m.recover_code <> $1
     ORDER BY m.created_at DESC`,
    [POSTMAN_CODE]
  )
  res.json(rows)
})

/** 手动配对：A 与 B 互相成为笔友 */
adminRouter.post('/pair', requireAdmin, async (req, res) => {
  const { a, b } = z.object({ a: z.number().int(), b: z.number().int() }).parse(req.body)
  if (a === b) throw new AppError(400, '不能和自己配对')

  const A = await one<{ id: number; nickname: string; moods: string[] }>(
    'SELECT id, nickname, moods FROM members WHERE id = $1',
    [a]
  )
  const B = await one<{ id: number; nickname: string; moods: string[] }>(
    'SELECT id, nickname, moods FROM members WHERE id = $1',
    [b]
  )
  if (!A || !B) throw new AppError(404, '成员不存在')

  await query('DELETE FROM match_pool WHERE member_id IN ($1,$2)', [a, b])
  await query(
    `DELETE FROM letters WHERE sender_nickname = '邮差' AND recipient_id IN ($1,$2)`,
    [a, b]
  )

  // 建立双向配对关系（排他：先清掉双方旧配对）
  await query(
    `DELETE FROM pairs WHERE member_id IN ($1,$2) OR peer_id IN ($1,$2)`,
    [a, b]
  )
  await query(
    `INSERT INTO pairs (member_id, peer_id) VALUES ($1,$2),($2,$1) ON CONFLICT DO NOTHING`,
    [a, b]
  )
  await query('DELETE FROM match_pool WHERE member_id IN ($1,$2)', [a, b])
  await deliverPendingLettersOf(a, b)
  await deliverPendingLettersOf(b, a)

  // 给双方各留一封「配对成功」的介绍信（发送者为邮差本身，不算对方写的，也不占在途名额）
  let postman = await one<{ id: number }>(
    `SELECT id FROM members WHERE recover_code = $1`, [POSTMAN_CODE]
  )
  if (!postman) {
    postman = await one<{ id: number }>(
      `INSERT INTO members (nickname, recover_code, code_hint, moods, is_test)
       VALUES ('邮差',$1,'POST',ARRAY['想被听见'],TRUE)
       RETURNING id`,
      [POSTMAN_CODE]
    )
  }

  for (const [self, peer] of [
    [A, B],
    [B, A],
  ]) {
    await query(
      `INSERT INTO letters (sender_id, recipient_id, sender_nickname, moods, title, body, status, sent_at, open_at)
       VALUES ($1,$2,$3,$4,$5,$6,'delivered',$7,$8)`,
      [
        postman!.id,
        self.id,
        '邮差',
        [],
        '为你找到了一个笔友',
        `现在你可以给「${peer.nickname}」写信了。\n\n你们互不相识，这很好。可以说一点平时没处说的话。\n\n信寄出后，对方等 ${RECEIVE_WAIT_SEC} 秒就能拆开。慢一点，也没关系。`,
        new Date(Date.now() - 1000),
        new Date(Date.now() - 1000),
      ]
    )
  }

  res.json({ ok: true, receiveWaitSec: RECEIVE_WAIT_SEC })
})

/** 待配对池 */
adminRouter.get('/pool', requireAdmin, async (_req, res) => {
  const rows = await query(
    `SELECT m.id, m.nickname, m.moods, m.created_at as "createdAt", mp.note
     FROM match_pool mp JOIN members m ON m.id = mp.member_id ORDER BY mp.created_at`
  )
  res.json(rows)
})

/** 一键把某成员放进配对池（新用户自动入池） */
adminRouter.post('/pool', requireAdmin, async (req, res) => {
  const { memberId, note } = z
    .object({ memberId: z.number().int(), note: z.string().max(80).optional().default('') })
    .parse(req.body)
  await query(
    `INSERT INTO match_pool (member_id, note) VALUES ($1,$2)
     ON CONFLICT (member_id) DO UPDATE SET note = EXCLUDED.note`,
    [memberId, note]
  )
  res.json({ ok: true })
})

adminRouter.delete('/pool/:memberId', requireAdmin, async (req, res) => {
  await query('DELETE FROM match_pool WHERE member_id = $1', [Number(req.params.memberId)])
  res.json({ ok: true })
})

/** 后台信件流 */
adminRouter.get('/letters', requireAdmin, async (_req, res) => {
  const rows = await query(
    `SELECT l.id, l.title, left(l.body, 60) as excerpt, l.status,
       l.sender_nickname as "senderNickname", m.nickname as "recipientNickname",
       l.sent_at as "sentAt", l.open_at as "openAt", l.moods
     FROM letters l LEFT JOIN members m ON m.id = l.recipient_id
     ORDER BY l.sent_at DESC LIMIT 100`
  )
  res.json(rows)
})

/** 配置信息，给前端展示用 */
adminRouter.get('/config', requireAdmin, (_req, res) => {
  res.json({ receiveWaitSec: RECEIVE_WAIT_SEC, moods: MOODS })
})

export { requireAdmin, ADMIN_KEY }
