import { Router } from 'express'
import { z } from 'zod'
import { query, one } from '../db/pool.js'
import { AppError } from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { MAX_BODY, RECEIVE_WAIT_SEC, TRANSIT_MINUTES, openTimeFrom, openTimeFor } from '../lib/config.js'
import { activePair, dissolvePair, ensureInPool, tryMatch } from '../lib/match.js'

export const letterRouter = Router()
letterRouter.use(requireAuth)

type Row = Record<string, any>

/** 统一对外结构：绝不暴露已读/在线/最后活跃 */
const shape = (l: Row) => {
  const openAt = new Date(l.openAt).getTime()
  const unlocked = l.status === 'pending' ? false : openAt <= Date.now()
  return {
    id: l.id,
    title: l.title,
    status: l.status,
    senderNickname: l.senderNickname,
    sentAt: l.sentAt,
    openAt: l.openAt,
    isMine: l.isMine,
    unlocked,
    countdownMs: unlocked ? 0 : openAt - Date.now(),
    body: unlocked ? l.body : null,
    peerNickname: l.peerNickname ?? null,
    repliedToId: l.repliedToId ?? null,
    hasReply: l.hasReply ?? false,
  }
}

const cols = (me: number) => `
  l.id, l.title, l.body, l.status,
  l.sent_at as "sentAt", l.open_at as "openAt",
  l.replied_to_id as "repliedToId",
  CASE WHEN l.sender_id = ${me} THEN TRUE ELSE FALSE END as "isMine",
  l.sender_nickname as "senderNickname",
  (SELECT count(*)::int FROM letters r WHERE r.replied_to_id = l.id) > 0 as "hasReply",
  (SELECT m.nickname FROM members m WHERE m.id = CASE WHEN l.sender_id = ${me}
      THEN l.recipient_id ELSE l.sender_id END) as "peerNickname"
`

/**
 * 寄信与回信不设频率限制。
 * 收信方在信件送达后需等待 RECEIVE_WAIT_SEC 秒（测试版 15 秒）才能拆开，
 * 由 open_at = 送达时间 + 收信等待 承担。
 */

/** 首页：匹配状态 + 信件列表 */
letterRouter.get('/home', async (req, res) => {
  const me = req.user!.id

  // 惰性触发一次自动匹配（幂等、廉价）
  const match = await tryMatch(me)
  await ensureInPool(me)

  const rows = await query(
    `SELECT ${cols(me)} FROM letters l
     WHERE l.recipient_id = $1 OR (l.sender_id = $1 AND l.status IN ('in_transit','delivered','pending'))
     ORDER BY l.sent_at DESC`,
    [me]
  )

  const counts = await one<any>(
    `SELECT
       (SELECT count(*)::int FROM letters WHERE recipient_id = $1 AND status = 'delivered'
          AND open_at > now()) as "inTransit",
       (SELECT count(*)::int FROM letters WHERE recipient_id = $1 AND status = 'delivered'
          AND open_at <= now()) as "deliverable",
       (SELECT count(*)::int FROM letters WHERE recipient_id = $1 AND status = 'read') as "read",
       (SELECT count(*)::int FROM letters WHERE sender_id = $1 AND status IN ('in_transit','delivered')) as "sentInTransit",
       (SELECT count(*)::int FROM letters WHERE sender_id = $1 AND status = 'pending') as "pending"`,
    [me]
  )

  const latest = await query(
    `SELECT ${cols(me)} FROM letters l WHERE l.recipient_id = $1 ORDER BY l.sent_at DESC LIMIT 5`,
    [me]
  )

  const member = await one<{ nickname: string }>('SELECT nickname FROM members WHERE id = $1', [me])
  const pair = match.peer ?? (await activePair(me).then((p) => (p ? { id: p.peer_id, nickname: p.nickname } : null)))

  const hasOutgoing = (counts?.sentInTransit ?? 0) + (counts?.pending ?? 0) > 0

  res.json({
    member,
    counts,
    matchState: pair ? 'matched' : 'waiting',
    penPalNickname: pair?.nickname ?? null,
    justMatched: match.matched,
    canWrite: Boolean(pair),
    writeState: !pair ? (hasOutgoing ? 'stranger_sent' : 'waiting') : 'ready',
    limits: {
      transitMinutes: TRANSIT_MINUTES,
      receiveWaitSec: RECEIVE_WAIT_SEC,
    },
    letters: rows.map(shape),
    latest: latest.map(shape),
  })
})

/** 寄信：有笔友寄给笔友；没笔友则以「写给陌生人」暂存，匹配成功自动送达 */
letterRouter.post('/', async (req, res) => {
  const data = z
    .object({
      title: z.string().trim().max(20, '标题最多 20 字').optional().default(''),
      body: z.string().trim().min(1, '信是空的').max(MAX_BODY, `信最多 ${MAX_BODY} 字`),
    })
    .parse(req.body)

  const me = req.user!.id

  const pair = await activePair(me)
  const sender = await one<{ nickname: string }>('SELECT nickname FROM members WHERE id = $1', [me])

  const sentAt = new Date()
  // 有笔友的直接送达，收信人再等 RECEIVE_WAIT_SEC 秒就能拆；暂存信在匹配成功时重新计时
  const openAt = pair ? openTimeFor(sentAt) : openTimeFrom(sentAt)
  const isPending = !pair

  const row = await one(
    `INSERT INTO letters (sender_id, recipient_id, sender_nickname, moods, title, body, status, sent_at, open_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      me,
      pair?.peer_id ?? null,
      sender!.nickname,
      [],
      data.title,
      data.body,
      isPending ? 'pending' : 'delivered',
      sentAt,
      openAt,
    ]
  )

  res.status(201).json({
    id: row!.id,
    sentAt,
    openAt,
    receiveWaitSec: RECEIVE_WAIT_SEC,
    pending: isPending,
  })
})

/** 信件详情 */
letterRouter.get('/:id', async (req, res) => {
  const me = req.user!.id
  const id = Number(req.params.id)
  const l = await one(
    `SELECT ${cols(me)} FROM letters l
     WHERE l.id = $1 AND (l.recipient_id = $2 OR l.sender_id = $2)`,
    [id, me]
  )
  if (!l) throw new AppError(404, '没有这封信')

  if (!l.isMine && l.status === 'in_transit') {
    if (new Date(l.openAt).getTime() <= Date.now()) {
      await query(`UPDATE letters SET status = 'delivered' WHERE id = $1 AND status = 'in_transit'`, [id])
      l.status = 'delivered'
    }
  }

  const payload = shape(l)
  if (l.isMine && l.status !== 'pending') payload.body = l.body
  return res.json(payload)
})

/** 拆信 */
letterRouter.post('/:id/open', async (req, res) => {
  const me = req.user!.id
  const id = Number(req.params.id)

  const l = await one<Row>(`SELECT * FROM letters WHERE id = $1 AND recipient_id = $2`, [id, me])
  if (!l) throw new AppError(404, '没有这封信')
  if (l.status === 'pending') throw new AppError(403, '这封信还没有人接住')
  if (new Date(l.open_at).getTime() > Date.now()) throw new AppError(403, '还没到能拆的时间')

  if (l.status !== 'read') {
    await query(`UPDATE letters SET status = 'read', opened_at = COALESCE(opened_at, now()) WHERE id = $1`, [id])
  }

  res.json({
    id: l.id,
    title: l.title,
    body: l.body,
    senderNickname: l.sender_nickname,
    sentAt: l.sent_at,
    openAt: l.open_at,
  })
})

/** 回信：只能回复已拆开的信 */
letterRouter.post('/:id/reply', async (req, res) => {
  const me = req.user!.id
  const id = Number(req.params.id)
  const data = z
    .object({
      title: z.string().trim().max(20).optional().default(''),
      body: z.string().trim().min(1, '信是空的').max(MAX_BODY, `信最多 ${MAX_BODY} 字`),
    })
    .parse(req.body)

  const origin = await one<Row>(`SELECT * FROM letters WHERE id = $1 AND recipient_id = $2`, [id, me])
  if (!origin) throw new AppError(404, '没有这封信')
  if (origin.status !== 'read') throw new AppError(400, '先拆开这封信，再回')

  const sender = await one<{ nickname: string }>('SELECT nickname FROM members WHERE id = $1', [me])

  const sentAt = new Date()
  const openAt = openTimeFor(sentAt)

  const row = await one(
    `INSERT INTO letters (sender_id, recipient_id, sender_nickname, moods, title, body, status, sent_at, open_at, replied_to_id)
     VALUES ($1,$2,$3,$4,$5,$6,'delivered',$7,$8,$9) RETURNING id`,
    [me, origin.sender_id, sender!.nickname, [], data.title, data.body, sentAt, openAt, id]
  )

  res.status(201).json({ id: row!.id, openAt, receiveWaitSec: RECEIVE_WAIT_SEC })
})

/** 我寄出的信 */
letterRouter.get('/sent/list', async (req, res) => {
  const me = req.user!.id
  const rows = await query(
    `SELECT ${cols(me)} FROM letters l WHERE l.sender_id = $1 ORDER BY l.sent_at DESC`,
    [me]
  )
  res.json(rows.map((r) => ({ ...shape(r), body: r.body })))
})

/** 解除配对：双方回到匹配队列（重新发出匹配请求） */
letterRouter.post('/pair/dissolve', async (req, res) => {
  const me = req.user!.id
  const result = await dissolvePair(me)
  if (!result.ok) throw new AppError(400, '你现在没有配对')
  res.json({ ok: true, message: `已和「${result.peerNickname}」解除配对，你们都会重新进入匹配` })
})
