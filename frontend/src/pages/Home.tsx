import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiDissolve, apiHome, type HomeData, type Letter } from '@/lib/api'
import { useSession } from '@/lib/session'
import { Shell, StatusPill, EnvelopeArt, PigeonArt } from '@/components/kit'
import { BottomNav } from '@/components/BottomNav'
import { softTime, splitMs, useCountdown } from '@/lib/time'
import { cn } from '@/lib/utils'

export default function Home() {
  const { member } = useSession()
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    apiHome()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const dissolve = () => {
    apiDissolve()
      .then(() => setTimeout(load, 300))
      .catch(() => {})
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return '这么晚还没睡'
    if (h < 11) return '早上好'
    if (h < 14) return '中午好'
    if (h < 19) return '下午好'
    return '晚上好'
  })()

  return (
    <Shell>
      <div className="pt-3 safe-top">
        <header className="flex items-start justify-between pb-6 pt-8">
          <div>
            <div className="text-[12px] tracking-[0.28em] text-[#a0a9a2]">慢 信</div>
            <h1 className="mt-2 text-[26px] leading-snug text-[#2C3E35]">
              {greeting}，{member?.nickname ?? '陌生人'}
            </h1>
          </div>
          <Link to="/me" className="tap mt-1 grid h-9 w-9 place-items-center rounded-full border border-[#ddd3c1] text-[#6a776f]">
            <span className="text-[13px]">{member?.nickname?.slice(0, 1) ?? '·'}</span>
          </Link>
        </header>

        {loading && !data ? (
          <Skeleton />
        ) : data ? (
          <div className="space-y-5">
            {/* 主卡：三种状态 */}
            <StatusCard data={data} onDissolve={dissolve} />

            {/* 在途 */}
            {data.letters.filter((l) => !l.unlocked && !l.isMine).length > 0 && (
              <Section title="在路上" hint="还没到能拆的时间">
                <div className="space-y-3">
                  {data.letters
                    .filter((l) => !l.unlocked && !l.isMine)
                    .map((l) => (
                      <InTransitCard key={l.id} letter={l} onArrived={load} />
                    ))}
                </div>
              </Section>
            )}

            {/* 自己寄出的在途 / 暂存 */}
            {data.counts.sentInTransit + data.counts.pending > 0 && (
              <Section title="你寄出的信" hint={data.counts.pending > 0 ? '其中一封在等一个陌生人' : '正在路上'}>
                <div className="space-y-3">
                  {data.letters
                    .filter((l) => l.isMine && (l.status === 'in_transit' || l.status === 'pending'))
                    .map((l) => (
                      <InTransitCard key={l.id} letter={l} mine onArrived={load} />
                    ))}
                </div>
              </Section>
            )}

            {/* 可拆 */}
            {data.letters.filter((l) => l.unlocked && !l.isMine && l.status !== 'read').length > 0 && (
              <Section title="可以拆了" hint="有人在等你回话">
                <div className="space-y-3">
                  {data.letters
                    .filter((l) => l.unlocked && !l.isMine && l.status !== 'read')
                    .map((l) => (
                      <ArrivedCard key={l.id} letter={l} />
                    ))}
                </div>
              </Section>
            )}

            {/* 全部收件 */}
            {data.latest.length > 0 && (
              <Section title="你的信箱" action={<Link to="/letters" className="text-[13px] text-[#8a948d]">全部 ›</Link>}>
                <div className="divide-y divide-[#e8dfd0] overflow-hidden rounded-[18px] border border-[#e4dbcb] bg-[#faf7f1]">
                  {data.latest.map((l) => (
                    <LetterRow key={l.id} letter={l} />
                  ))}
                </div>
              </Section>
            )}

            {data.latest.length === 0 && data.letters.length === 0 && <EmptyState />}
          </div>
        ) : (
          <p className="py-16 text-center text-[14px] text-[#8a948d]">暂时读不到信箱，稍后再试</p>
        )}
      </div>
      <BottomNav />
    </Shell>
  )
}

function StatusCard({ data, onDissolve }: { data: HomeData; onDissolve: () => void }) {
  const { counts, writeState, penPalNickname, matchState } = data

  const content = {
    ready: {
      tag: '已为你找到笔友',
      title: `给「${penPalNickname}」写封信`,
      desc: '把今天没处说的话，写下来',
      cta: '开始写',
      to: '/write',
      art: 'sealed' as const,
    },
    in_transit: {
      tag: '在途',
      title: '你的信正在路上',
      desc: '信鸽正叼着它飞。等它到了，再看看要不要写下一封。',
      cta: '看看路上',
      to: '/letters',
      art: 'traveling' as const,
    },
    waiting: {
      tag: '寻找笔友',
      title: '正在为你找一个合拍的人',
      desc: '按你们此刻的心情在找。也可以先写一封，替你等着。',
      cta: '先写一封',
      to: '/write',
      art: 'sealed' as const,
    },
    stranger_sent: {
      tag: '信已寄出',
      title: '你的信在等一个陌生人',
      desc: '有带着同样心情的人出现时，这封信会被接住，送到对方手里。',
      cta: '看看这封信',
      to: '/letters',
      art: 'traveling' as const,
    },
  }[writeState]

  return (
    <div className="card-soft relative overflow-hidden px-5 py-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#eae1d1]/60 blur-xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5d7a63]" />
            <span className="text-[11px] tracking-[0.2em] text-[#8a948d]">{content.tag}</span>
          </div>
          <h2 className="text-[19px] leading-snug text-[#2C3E35]">{content.title}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#7a857e]">{content.desc}</p>

          <Link
            to={content.to}
            className="tap mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#2C3E35] px-4 py-2 text-[13.5px] text-[#F7F2E9]"
          >
            {content.cta}
            <span className="text-[15px] leading-none opacity-70">→</span>
          </Link>

          {matchState === 'matched' && (
            <button
              onClick={onDissolve}
              className="tap mt-3 block text-[12px] text-[#b0b8b2] underline decoration-[#d5cbb9] underline-offset-4"
            >
              解除这个配对
            </button>
          )}
        </div>

        {content.art === 'traveling' ? (
          <PigeonArt className="w-[118px] shrink-0" />
        ) : (
          <EnvelopeArt className="w-[92px] shrink-0 float-slow" state={content.art} />
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#eae1d1] pt-4">
        <Metric n={counts.inTransit} label="在路上" />
        <Metric n={counts.deliverable} label="可拆" accent={counts.deliverable > 0} />
        <Metric n={counts.read} label="已拆开" />
      </div>
    </div>
  )
}

function Metric({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={cn('text-[20px] leading-tight', accent ? 'text-[#a9705c]' : 'text-[#2C3E35]')}>{n}</div>
      <div className="mt-0.5 text-[11.5px] tracking-wide text-[#96a098]">{label}</div>
    </div>
  )
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="pt-1">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[14px] tracking-[0.08em] text-[#3f4f46]">{title}</h3>
          {hint && <span className="text-[11.5px] text-[#a8b0a9]">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function InTransitCard({
  letter,
  mine,
  onArrived,
}: {
  letter: Letter
  mine?: boolean
  onArrived: () => void
}) {
  const left = useCountdown(letter.openAt, onArrived)
  const { h, m, s } = splitMs(left)

  return (
    <Link
      to={`/letter/${letter.id}`}
      className="card-lift tap block rounded-[18px] border border-[#e4dbcb] bg-[#f8f3ea] px-4 py-4"
    >
      <div className="flex items-center justify-between">
        <StatusPill tone="transit">
          <span className="mr-0.5 inline-block h-1 w-1 rounded-full bg-[#b98b4e] breathe" />
          {letter.status === 'pending' ? '等待被接住' : mine ? '送往对方' : '在途中'}
        </StatusPill>
        {letter.status === 'pending' ? (
          <span className="text-[11.5px] text-[#a8967a]">匹配成功即寄出</span>
        ) : (
          <span className="stamp-serif text-[12px] text-[#a8967a]">
            {h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`}
            <span className="ml-1 text-[10px] text-[#b5a68e]">后到</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ece2d1] text-[13px] text-[#8a6a3c]">
          {letter.senderNickname.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] text-[#2C3E35]">
            {letter.status === 'pending' ? '一封给陌生人的信' : mine ? '你写的信' : letter.senderNickname}
          </div>
          <div className="mt-0.5 text-[11.5px] text-[#9ba49d]">
            {letter.status === 'pending' ? '写给一位还没出现的人' : mine ? `寄给 ${letter.peerNickname ?? '对方'}` : `来自 ${letter.senderNickname}`} · {softTime(letter.sentAt)}
          </div>
        </div>
        <PigeonArt className="w-14 shrink-0 opacity-90" />
      </div>
    </Link>
  )
}

function ArrivedCard({ letter }: { letter: Letter }) {
  return (
    <Link
      to={`/letter/${letter.id}`}
      className="card-lift tap relative block rounded-[18px] border border-[#cfdbd2] bg-[#f2f6f1] px-4 py-4"
    >
      <div className="flex items-center justify-between">
        <StatusPill tone="ready">可以拆了</StatusPill>
        <span className="text-[11.5px] text-[#8fa093]">{softTime(letter.sentAt)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0">
          <EnvelopeArt state="sealed" className="w-11" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] text-[#2C3E35]">{letter.senderNickname}</div>
          <div className="mt-0.5 text-[11.5px] text-[#8fa093]">有一封信给你</div>
        </div>
        <span className="rounded-full bg-[#3f5a48] px-3 py-1.5 text-[12px] text-[#f2f6f1]">拆开</span>
      </div>
    </Link>
  )
}

function LetterRow({ letter }: { letter: Letter }) {
  const locked = !letter.unlocked
  return (
    <Link to={`/letter/${letter.id}`} className="tap flex items-start gap-3 px-4 py-3.5 transition active:bg-[#f4eee3]">
      <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e0d6c5] bg-[#f3ecdf] text-[12px] text-[#8a6a3c]">
        {letter.senderNickname.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('truncate text-[14px]', letter.status === 'delivered' ? 'text-[#2C3E35]' : 'text-[#55645c]')}>
            {letter.isMine ? '你寄出的信' : letter.senderNickname}
          </span>
          {letter.status === 'delivered' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a9705c]" />}
        </div>
        <div className="mt-0.5 text-[12.5px] leading-relaxed text-[#96a098]">
          {letter.isMine
            ? `寄给 ${letter.peerNickname ?? '对方'}`
            : locked
              ? '信鸽还在路上'
              : '有一封信，等你拆'}
        </div>
      </div>
      <div className="shrink-0 pt-1 text-[11px] text-[#b0b8b2]">{softTime(letter.sentAt)}</div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="card-soft mt-2 px-6 py-10 text-center">
      <p className="text-[14px] leading-loose text-[#7a857e]">
        信箱还是空的。
        <br />
        等有人给你写信，或者你先写一封。
      </p>
      <Link to="/write" className="tap mt-5 inline-block rounded-full border border-[#2C3E35] px-5 py-2 text-[13.5px] text-[#2C3E35]">
        写第一封
      </Link>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[220px] animate-pulse rounded-[18px] bg-[#ece5d8]" />
      <div className="h-[92px] animate-pulse rounded-[18px] bg-[#ece5d8]" />
      <div className="h-[92px] animate-pulse rounded-[18px] bg-[#ece5d8]" />
    </div>
  )
}
