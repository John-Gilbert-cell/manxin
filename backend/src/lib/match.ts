import { query, one } from '../db/pool.js'
import { POSTMAN_CODE, RECEIVE_WAIT_SEC } from './config.js'

/** 用户当前是否已有活跃配对 */
export async function activePair(memberId: number) {
  return one<{ peer_id: number; nickname: string }>(
    `SELECT p.peer_id, m.nickname FROM pairs p JOIN members m ON m.id = p.peer_id
     WHERE p.member_id = $1 LIMIT 1`,
    [memberId]
  )
}

/** 在等待池里按共同标签寻找配对对象：标签重合最多者优先，其次先来后到 */
async function findCandidate(memberId: number, moods: string[]) {
  return one<{ id: number; nickname: string; overlap: number }>(
    `SELECT m.id, m.nickname,
            cardinality(ARRAY(SELECT unnest(m.moods) INTERSECT SELECT unnest($2::text[]))) as overlap
     FROM match_pool mp JOIN members m ON m.id = mp.member_id
     WHERE mp.member_id <> $1 AND m.recover_code <> $3
       AND (SELECT count(*) FROM unnest(m.moods) x WHERE x = ANY($2::text[])) > 0
       AND NOT EXISTS (
         SELECT 1 FROM match_events e
         WHERE e.kind = 'dissolved'
           AND e.created_at > now() - interval '30 minutes'
           AND ((e.a_id = m.id AND e.b_id = $1) OR (e.b_id = m.id AND e.a_id = $1))
       )
     ORDER BY overlap DESC, mp.created_at ASC
     LIMIT 1`,
    [memberId, moods, POSTMAN_CODE]
  )
}

/** 匹配成功后：把「写给陌生人的暂存信」投递给新笔友 */
export async function deliverPendingLettersOf(senderId: number, recipientId: number) {
  const pending = await query<{ id: number }>(
    `SELECT id FROM letters WHERE sender_id = $1 AND recipient_id IS NULL AND status = 'pending'
     ORDER BY sent_at ASC`,
    [senderId]
  )
  for (const l of pending) {
    // 从被接住的一刻重新计时：收信人再等 RECEIVE_WAIT_SEC 秒即可拆
    await query(
      `UPDATE letters SET recipient_id = $2, status = 'delivered',
         sent_at = now(), open_at = now() + ($3 || ' seconds')::interval
       WHERE id = $1`,
      [l.id, recipientId, String(RECEIVE_WAIT_SEC)]
    )
  }
  return pending.length
}

export type MatchResult = { matched: boolean; peer: { id: number; nickname: string } | null; delivered: number }

/**
 * 尝试为成员匹配笔友（可惰性调用，幂等）。
 * 规则：一人只对应一人；双方有至少一个共同标签；两边都无活跃配对。
 */
export async function tryMatch(memberId: number): Promise<MatchResult> {
  const existing = await activePair(memberId)
  if (existing) {
    return { matched: true, peer: { id: existing.peer_id, nickname: existing.nickname }, delivered: 0 }
  }

  const me = await one<{ id: number; nickname: string; moods: string[] }>(
    'SELECT id, nickname, moods FROM members WHERE id = $1',
    [memberId]
  )
  if (!me) return { matched: false, peer: null, delivered: 0 }

  const candidate = await findCandidate(memberId, me.moods)
  if (!candidate) return { matched: false, peer: null, delivered: 0 }

  // 确保对方此刻仍无配对（并发兜底）
  const peerBusy = await activePair(candidate.id)
  if (peerBusy) {
    await query('DELETE FROM match_pool WHERE member_id = $1', [candidate.id])
    return { matched: false, peer: null, delivered: 0 }
  }

  await query(
    `INSERT INTO pairs (member_id, peer_id) VALUES ($1,$2),($2,$1) ON CONFLICT DO NOTHING`,
    [me.id, candidate.id]
  )
  await query(`INSERT INTO match_events (a_id, b_id, kind) VALUES ($1,$2,'paired')`, [me.id, candidate.id])
  await query('DELETE FROM match_pool WHERE member_id IN ($1,$2)', [me.id, candidate.id])

  // 双方的暂存信互相投递
  const d1 = await deliverPendingLettersOf(me.id, candidate.id)
  const d2 = await deliverPendingLettersOf(candidate.id, me.id)

  return { matched: true, peer: { id: candidate.id, nickname: candidate.nickname }, delivered: d1 + d2 }
}

/** 解除配对：双方回到等待池（重新发出匹配请求），在途与已读的信保持不动 */
export async function dissolvePair(memberId: number) {
  const pair = await activePair(memberId)
  if (!pair) return { ok: false }

  const rows = await query<{ a_id: number; b_id: number }>(
    `SELECT member_id as "a_id", peer_id as "b_id" FROM pairs
     WHERE member_id = $1 OR peer_id = $1`,
    [memberId]
  )
  for (const r of rows) {
    await query(`INSERT INTO match_events (a_id, b_id, kind) VALUES ($1,$2,'dissolved')`, [r.a_id, r.b_id])
  }
  await query(
    `DELETE FROM pairs WHERE member_id IN (SELECT member_id FROM pairs WHERE member_id = $1 OR peer_id = $1)
       OR peer_id IN (SELECT member_id FROM pairs WHERE member_id = $1 OR peer_id = $1)`,
    [memberId]
  )

  // 双方重新入池
  for (const id of [memberId, pair.peer_id]) {
    const isPostman = await one(`SELECT 1 FROM members WHERE id = $1 AND recover_code = $2`, [id, POSTMAN_CODE])
    if (!isPostman) {
      await query(`INSERT INTO match_pool (member_id) VALUES ($1) ON CONFLICT (member_id) DO NOTHING`, [id])
    }
  }
  return { ok: true, peerNickname: pair.nickname }
}

/** 注册 / 任何时候：确保未配对成员在等待池里 */
export async function ensureInPool(memberId: number) {
  const paired = await activePair(memberId)
  if (paired) return
  await query(`INSERT INTO match_pool (member_id) VALUES ($1) ON CONFLICT (member_id) DO NOTHING`, [memberId])
}
