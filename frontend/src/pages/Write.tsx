import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiHome, apiLetter, apiReply, apiSend, errText, type Letter } from '@/lib/api'
import { useSession } from '@/lib/session'
import { Shell, WaxSeal, PigeonArt } from '@/components/kit'
import { cn } from '@/lib/utils'

const MAX = 500

export default function Write() {
  const { id } = useParams<{ id: string }>()
  const replyTo = id ? Number(id) : null
  const { member } = useSession()
  const navigate = useNavigate()

  const [body, setBody] = useState('')
  const [origin, setOrigin] = useState<Letter | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [asStranger, setAsStranger] = useState(false)

  const [hasPenPal, setHasPenPal] = useState(false)
  const [waitSec, setWaitSec] = useState(15)

  useEffect(() => {
    apiHome()
      .then((d) => {
        setHasPenPal(d.matchState === 'matched')
        if (d.limits?.receiveWaitSec) setWaitSec(d.limits.receiveWaitSec)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!replyTo) return
    apiLetter(replyTo)
      .then(setOrigin)
      .catch(() => setError('这封信暂时读不到'))
  }, [replyTo])

  const count = useMemo(() => body.trim().length, [body])
  const near = count > MAX - 40
  const over = count > MAX

  const submit = async () => {
    if (!body.trim()) return setError('信还是空的')
    if (over) return setError(`超过 ${MAX} 字了，删一点吧`)
    if (!origin && !member?.nickname) return setError('身份还没准备好')
    setBusy(true)
    setError('')
    try {
      if (replyTo) {
        await apiReply(replyTo, body.trim())
        setAsStranger(false)
      } else {
        const r = await apiSend(body.trim())
        setAsStranger(r.pending)
      }
      setDone(true)
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  if (done) return <SentScreen stranger={asStranger} onDone={() => navigate('/home', { replace: true })} />

  return (
    <Shell>
      <div className="pt-3 safe-top">
        <header className="flex items-center justify-between pb-2 pt-7">
          <button onClick={() => navigate(-1)} className="tap -ml-1 flex items-center gap-1 text-[14px] text-[#8a948d]">
            <span className="text-[18px] leading-none">‹</span> 返回
          </button>
          <span className="text-[11px] tracking-[0.24em] text-[#a0a9a2]">写 信</span>
          <span className="w-12" />
        </header>

        {replyTo && origin ? (
          <div className="mt-3 rounded-[14px] border border-[#e4dbcb] bg-[#f3ecdf] px-4 py-3">
            <div className="text-[11px] tracking-[0.18em] text-[#a8967a]">回 给</div>
            <div className="mt-1 text-[14px] text-[#3f4f46]">{origin.senderNickname}</div>
          </div>
        ) : (
          <p className="mt-3 px-1 text-[13px] leading-relaxed text-[#8a948d]">
            写给{hasPenPal ? '你的笔友' : '一位陌生人'}。他看不到你在哪儿，也不知道你是谁。
          </p>
        )}

        <div className="card-soft mt-5 overflow-hidden">
          <div className="relative px-5 pb-2 pt-5">
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                setError('')
              }}
              placeholder="写点什么。今天怎么过的，有没有一件事一直没说出口。"
              rows={12}
              className="paper-lines w-full resize-none bg-transparent text-[16px] leading-[34px] text-[#2C3E35] outline-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-[#eee5d6] px-5 py-3">
            <div className="flex items-center gap-2 text-[11.5px] text-[#a8b0a9]">
              <WaxSeal className="h-6 w-6 text-[8px]" />
              对方 {waitSec} 秒后可拆
            </div>
            <div className="flex items-center gap-2">
              {near && (
                <div className="h-1 w-14 overflow-hidden rounded-full bg-[#eee5d6]">
                  <div
                    className={cn('h-full rounded-full transition-all', over ? 'bg-[#a8543f]' : 'bg-[#b98b4e]')}
                    style={{ width: `${Math.min(100, (count / MAX) * 100)}%` }}
                  />
                </div>
              )}
              <span className={cn('stamp-serif text-[12.5px]', over ? 'text-[#a8543f]' : near ? 'text-[#b98b4e]' : 'text-[#b0b8b2]')}>
                {count}/{MAX}
              </span>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 px-1 text-[13px] text-[#a8543f]">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || !body.trim() || over}
          className={cn(
            'tap mt-6 w-full rounded-[16px] py-4 text-[16px] tracking-[0.12em] transition',
            body.trim() && !over
              ? 'bg-[#2C3E35] text-[#F7F2E9] shadow-[0_6px_18px_rgba(44,62,53,0.16)]'
              : 'bg-[#e3dbcc] text-[#a3aca5]'
          )}
        >
          {busy ? '正在封好…' : '寄 出'}
        </button>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-[#a8b0a9]">
          {hasPenPal
            ? '想写几封都行。寄出后不能撤回，这也正是写信的意思。'
            : '还没有人为你停留。这封信会先替你等着，等一个合拍的人出现。'}
        </p>
      </div>
    </Shell>
  )
}

function SentScreen({ onDone, stranger }: { onDone: () => void; stranger?: boolean }) {
  return (
    <Shell nav={false} className="flex min-h-screen flex-col items-center justify-center">
      <div className="ink-in flex flex-col items-center text-center">
        <div className="mb-9 w-36">
          <PigeonArt />
        </div>

        <h2 className="text-[23px] leading-relaxed text-[#2C3E35]">
          {stranger ? '信替你收好了' : '信鸽已经起飞'}
        </h2>
        <p className="mt-3 text-[14px] leading-[2] text-[#7a857e]">
          {stranger ? (
            <>
              还没有人和你带着一样的心情。
              <br />
              这封信会在系统里等你——等一个合拍的人出现，
              <br />
              它会被接住，慢慢送到对方手里。
            </>
          ) : (
            <>
              它正叼着你的信飞过去。
              <br />
              对方收到后，要等一会儿才能拆开。
            </>
          )}
        </p>

        <button
          onClick={onDone}
          className="tap mt-11 rounded-full border border-[#2C3E35] px-7 py-2.5 text-[14px] text-[#2C3E35]"
        >
          回到信箱
        </button>
      </div>
    </Shell>
  )
}
