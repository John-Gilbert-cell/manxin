import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiLetter, apiOpen, errText, type Letter } from '@/lib/api'
import { Shell, EnvelopeArt, StatusPill, PigeonArt } from '@/components/kit'
import { dateTime, splitMs, useCountdown } from '@/lib/time'
import { cn } from '@/lib/utils'

type Opened = {
  id: number
  title: string
  body: string
  senderNickname: string
  sentAt: string
}

export default function LetterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [opened, setOpened] = useState<Opened | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (!id) return
    apiLetter(Number(id))
      .then((l) => {
        setLetter(l)
        if (l.isMine) setOpened({ ...l, body: l.body || '' })
        else if (l.status === 'read') {
          apiOpen(l.id).then(setOpened).catch(() => {})
        }
      })
      .catch((e) => setErr(errText(e)))
  }, [id])

  const left = useCountdown(letter && !letter.unlocked && !letter.isMine ? letter.openAt : null, () => {
    if (letter) {
      apiLetter(letter.id).then(setLetter).catch(() => {})
    }
  })

  const doOpen = async () => {
    if (!letter) return
    setBusy(true)
    setErr('')
    try {
      const res = await apiOpen(letter.id)
      setOpening(true)
      setTimeout(() => {
        setOpened(res)
        setOpening(false)
      }, 700)
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }

  if (err)
    return (
      <Shell nav={false}>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <p className="text-[14px] text-[#8a948d]">{err}</p>
          <button onClick={() => navigate(-1)} className="tap mt-6 text-[13px] text-[#2C3E35] underline underline-offset-4">
            返回信箱
          </button>
        </div>
      </Shell>
    )

  if (!letter) return <Shell><div className="pt-32 text-center text-[13px] text-[#a8b0a9]">正在打开信箱…</div></Shell>

  const { h, m, s } = splitMs(left)
  const locked = !letter.isMine && !letter.unlocked

  return (
    <Shell>
      <div className="pt-3 safe-top">
        <header className="flex items-center justify-between pb-2 pt-7">
          <button onClick={() => navigate(-1)} className="tap -ml-1 flex items-center gap-1 text-[14px] text-[#8a948d]">
            <span className="text-[18px] leading-none">‹</span> 信箱
          </button>
          <span className="text-[11px] tracking-[0.24em] text-[#a0a9a2]">一 封 信</span>
          <span className="w-12" />
        </header>

        {locked ? (
          <LockedView
            letter={letter}
            h={h}
            m={m}
            s={s}
            busy={busy}
            opening={opening}
            onOpen={doOpen}
          />
        ) : opened ? (
          <OpenView letter={opened} mine={letter.isMine} replyTo={letter} />
        ) : letter.isMine ? (
          <MineSealedView letter={letter} />
        ) : (
          <ReadyToOpenView letter={letter} busy={busy} opening={opening} onOpen={doOpen} />
        )}
      </div>
    </Shell>
  )
}

function LockedView({
  letter,
  h,
  m,
  s,
  busy,
  opening,
  onOpen,
}: {
  letter: Letter
  h: number
  m: number
  s: number
  busy: boolean
  opening: boolean
  onOpen: () => void
}) {
  const nearly = letter.countdownMs > 0 && letter.countdownMs < 60 * 1000
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <div className={cn('w-[220px] transition-all duration-700', opening && 'translate-y-[-8px] scale-105 opacity-0')}>
        <PigeonArt />
      </div>

      <div className="mt-6">
        <StatusPill tone="transit">
          <span className="mr-1 inline-block h-1 w-1 rounded-full bg-[#b98b4e] breathe" />
          {letter.isMine ? '你寄出的信 · 在途' : '在途 · 信鸽正在飞'}
        </StatusPill>
      </div>

      <h1 className="mt-4 max-w-[300px] text-[22px] leading-snug text-[#2C3E35]">
        {letter.isMine ? (letter.peerNickname ?? '对方') : letter.senderNickname}
      </h1>
      <p className="mt-2 text-[13px] text-[#8a948d]">
        {letter.isMine ? '你的信正在飞往对方' : '有一封信，还在路上'}
      </p>

      <div className="mt-9 flex items-center gap-3">
        <TimeBox n={h} unit="时" />
        <Dot />
        <TimeBox n={m} unit="分" />
        <Dot />
        <TimeBox n={s} unit="秒" />
      </div>
      <p className="mt-3 text-[12px] tracking-wide text-[#a8b0a9]">
        {h > 0 ? '还需要一点时间' : nearly ? '快了，等一下' : '还没到能拆的时候'}
      </p>

      {letter.isMine ? (
        <p className="mt-10 max-w-[280px] text-[13px] leading-[1.95] text-[#9ba49d]">
          这封信正在路上。
          <br />
          到达之后，对方才能拆开它。
        </p>
      ) : (
        <button
          onClick={onOpen}
          disabled={busy}
          className="tap mt-10 rounded-full border border-[#ddd3c1] px-6 py-2.5 text-[13.5px] text-[#a3aca5]"
        >
          {busy ? '试着拆…' : '还拆不开'}
        </button>
      )}

      <div className="mt-11 w-full max-w-[300px] rounded-[16px] border border-dashed border-[#dcd2c0] px-5 py-4 text-left">
        <div className="text-[11px] tracking-[0.18em] text-[#b0b8b2]">信 封 外 面</div>
        <div className="mt-2 text-[13px] leading-[1.9] text-[#7a857e]">
          寄出于 {dateTime(letter.sentAt)}
          <br />
          可拆时间 {dateTime(letter.openAt)}
        </div>
      </div>
    </div>
  )
}

function ReadyToOpenView({
  letter,
  busy,
  opening,
  onOpen,
}: {
  letter: Letter
  busy: boolean
  opening: boolean
  onOpen: () => void
}) {
  return (
    <div className={cn('flex flex-col items-center pt-10 text-center transition-all duration-700', opening && 'scale-105 opacity-60')}>
      <div className="w-[190px]">
        <EnvelopeArt state={opening ? 'opened' : 'sealed'} className="w-[190px]" />
      </div>

      <div className="mt-9">
        <StatusPill tone="ready">已经到了</StatusPill>
      </div>

      <h1 className="mt-4 max-w-[300px] text-[22px] leading-snug text-[#2C3E35]">
        {letter.senderNickname}
      </h1>
      <p className="mt-2 text-[13px] text-[#8a948d]">有一封信已经到了</p>

      <button
        onClick={onOpen}
        disabled={busy || opening}
        className="tap mt-9 rounded-[16px] bg-[#2C3E35] px-12 py-4 text-[16px] tracking-[0.16em] text-[#F7F2E9] shadow-[0_8px_22px_rgba(44,62,53,0.2)] disabled:opacity-60"
      >
        {opening ? '拆 开 中 …' : '拆 开'}
      </button>
      <p className="mt-4 text-[12px] text-[#a8b0a9]">慢慢读，不用急</p>
    </div>
  )
}

function MineSealedView({ letter }: { letter: Letter }) {
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <div className="w-[190px]">
        <EnvelopeArt state="sealed" className="w-[190px]" />
      </div>
      <div className="mt-9">
        <StatusPill tone="transit">
          {letter.status === 'in_transit' ? '你的信正在路上' : '已送达'}
        </StatusPill>
      </div>
      <h1 className="mt-4 max-w-[300px] text-[22px] leading-snug text-[#2C3E35]">
        {letter.peerNickname ?? '对方'}
      </h1>
      <p className="mt-2 text-[13px] text-[#8a948d]">你寄出的信</p>

      <div className="mt-10 w-full max-w-[320px] rounded-[18px] border border-[#e4dbcb] bg-[#faf7f1] px-6 py-6 text-left">
        <div className="mb-2 text-[11px] tracking-[0.2em] text-[#b0b8b2]">你 写 的</div>
        <div className="whitespace-pre-wrap text-[14.5px] leading-[1.95] text-[#55645c]">{letter.body}</div>
      </div>

      <p className="mt-6 max-w-[280px] text-[12.5px] leading-[1.9] text-[#9ba49d]">
        {letter.status === 'in_transit'
          ? '信还在路上。对方要到点才能拆开它。'
          : '对方已经可以拆开这封信了。'}
      </p>
    </div>
  )
}

function TimeBox({ n, unit }: { n: number; unit: string }) {
  return (
    <div className="flex w-[58px] flex-col items-center">
      <div className="stamp-serif text-[30px] leading-none text-[#2C3E35]">{String(n).padStart(2, '0')}</div>
      <div className="mt-1.5 text-[10px] tracking-[0.2em] text-[#b0b8b2]">{unit}</div>
    </div>
  )
}

function Dot() {
  return <span className="mb-4 text-[16px] text-[#cdc3b1]">:</span>
}

function OpenView({ letter, mine, replyTo }: { letter: Opened; mine: boolean; replyTo: Letter }) {
  const navigate = useNavigate()
  return (
    <div className="ink-in pt-3">
      <div className="mb-5 flex items-center justify-between">
        <StatusPill tone="read">{mine ? '已寄出' : '已拆开'}</StatusPill>
        <span className="text-[11.5px] text-[#a8b0a9]">{dateTime(letter.sentAt)}</span>
      </div>

      <article className="card-soft relative overflow-hidden px-6 pb-10 pt-7">
        {/* 信纸上沿装饰 */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#e8dfd0] via-[#d9cbb3] to-[#e8dfd0]" />

        <div className="mb-5">
          <div className="text-[11px] tracking-[0.2em] text-[#b0b8b2]">{mine ? '来 自 你' : '来 自'}</div>
          <div className="mt-1 text-[15px] text-[#2C3E35]">{letter.senderNickname}</div>
        </div>

        <div className="rule-dashed mb-6" />

        <div className="whitespace-pre-wrap text-[16px] leading-[2.05] tracking-[0.01em] text-[#33443b]">
          {letter.body}
        </div>

        <div className="rule-dashed mt-8 mb-4" />
        <div className="text-right text-[12px] text-[#a8b0a9]">
          写于 {dateTime(letter.sentAt)}
        </div>
      </article>

      {mine ? (
        <div className="mt-6 rounded-[16px] border border-dashed border-[#dcd2c0] px-5 py-5 text-center">
          <p className="text-[13px] leading-[1.95] text-[#8a948d]">
            {replyTo.hasReply ? '对方已经回过信了。' : '对方拆开这封信之后，或许会回你。'}
            <br />
            不管回不回，你都把话说出来了。
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={() => navigate(`/write/${letter.id}`)}
            className="tap w-full rounded-[16px] bg-[#2C3E35] py-4 text-[16px] tracking-[0.1em] text-[#F7F2E9] shadow-[0_6px_18px_rgba(44,62,53,0.16)]"
          >
            回 一 封
          </button>
          <p className="mt-3 text-[12px] leading-relaxed text-[#a8b0a9]">
            回不回都行。不用勉强自己。
          </p>
        </div>
      )}
    </div>
  )
}
