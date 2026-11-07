import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiHome, apiSent, type HomeData, type Letter } from '@/lib/api'
import { Shell, StatusPill } from '@/components/kit'
import { BottomNav } from '@/components/BottomNav'
import { softTime } from '@/lib/time'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'locked' | 'ready' | 'sent'

export default function Letters() {
  const [data, setData] = useState<HomeData | null>(null)
  const [sent, setSent] = useState<Letter[]>([])
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    apiHome().then(setData).catch(() => {})
    apiSent().then(setSent).catch(() => {})
  }, [])

  const inbox = data?.letters.filter((l) => !l.isMine) ?? []
  const filtered = (() => {
    if (tab === 'sent') return sent
    if (tab === 'locked') return inbox.filter((l) => !l.unlocked)
    if (tab === 'ready') return inbox.filter((l) => l.unlocked && l.status !== 'read')
    return inbox
  })()

  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'all', label: '全部', n: inbox.length },
    { key: 'locked', label: '在途', n: inbox.filter((l) => !l.unlocked).length },
    { key: 'ready', label: '可拆', n: inbox.filter((l) => l.unlocked && l.status !== 'read').length },
    { key: 'sent', label: '寄出', n: sent.length },
  ]

  return (
    <Shell>
      <div className="pt-3 safe-top">
        <header className="pb-4 pt-8">
          <div className="text-[11px] tracking-[0.28em] text-[#a0a9a2]">信 箱</div>
          <h1 className="mt-2 text-[24px] text-[#2C3E35]">所有来往的信</h1>
        </header>

        <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'tap shrink-0 rounded-full border px-4 py-2 text-[13px] transition',
                tab === t.key
                  ? 'border-[#2C3E35] bg-[#2C3E35] text-[#F5F0E8]'
                  : 'border-[#ddd3c1] bg-transparent text-[#7a857e]'
              )}
            >
              {t.label}
              {typeof t.n === 'number' && t.n > 0 && (
                <span className={cn('ml-1.5 text-[11px]', tab === t.key ? 'text-[#c9d1c9]' : 'text-[#a8b0a9]')}>
                  {t.n}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[14px] leading-loose text-[#9ba49d]">
              {tab === 'sent' ? '你还没有寄出过信。' : tab === 'locked' ? '路上没有信。' : tab === 'ready' ? '暂时没有能拆的信。' : '信箱是空的。'}
            </p>
            <Link to="/write" className="tap mt-5 inline-block text-[13px] text-[#2C3E35] underline underline-offset-4">
              写一封
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#e8dfd0] overflow-hidden rounded-[18px] border border-[#e4dbcb] bg-[#faf7f1]">
            {filtered.map((l) => (
              <Row key={l.id} letter={l} />
            ))}
          </div>
        )}

        <p className="mt-8 px-2 text-center text-[12px] leading-relaxed text-[#b0b8b2]">
          这里不显示谁读过、谁在线。
          <br />
          你只需要知道，有人收到过。
        </p>
      </div>
      <BottomNav />
    </Shell>
  )
}

function Row({ letter }: { letter: Letter }) {
  const mine = letter.isMine
  const locked = !letter.unlocked && !mine
  return (
    <Link to={`/letter/${letter.id}`} className="tap flex items-start gap-3 px-4 py-4 transition active:bg-[#f4eee3]">
      <div
        className={cn(
          'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12.5px]',
          locked ? 'border border-dashed border-[#d9cfbd] text-[#b0a48c]' : 'bg-[#f0e8da] text-[#8a6a3c]'
        )}
      >
        {mine ? '我' : letter.senderNickname.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14.5px] text-[#2C3E35]">
            {mine ? '你寄出的信' : letter.senderNickname}
          </span>
          {letter.status === 'delivered' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a9705c]" />}
        </div>
        <div className="mt-0.5 text-[12.5px] text-[#96a098]">
          {mine
            ? `寄给 ${letter.peerNickname ?? '对方'} · ${locked ? '信鸽还在路上' : letter.unlocked ? '已送达' : '在途'}`
            : locked
              ? '信鸽还在路上'
              : '有一封信，等你拆'}
        </div>
        <div className="mt-1.5">
          {mine ? (
            <StatusPill tone={letter.unlocked ? 'read' : 'transit'}>{letter.unlocked ? '已送达' : '在途'}</StatusPill>
          ) : locked ? (
            <StatusPill tone="transit">在途</StatusPill>
          ) : letter.status === 'read' ? (
            <StatusPill tone="read">已拆开</StatusPill>
          ) : (
            <StatusPill tone="ready">可拆</StatusPill>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-1 text-[11px] text-[#b0b8b2]">{softTime(letter.sentAt)}</div>
    </Link>
  )
}
