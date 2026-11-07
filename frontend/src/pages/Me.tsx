import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiDissolve, apiHome, apiMe, apiRecover, errText, type Member } from '@/lib/api'
import { TOKEN_KEY, useSession } from '@/lib/session'
import { Shell, WaxSeal } from '@/components/kit'
import { BottomNav } from '@/components/BottomNav'
import { dateTime } from '@/lib/time'

export default function Me() {
  const { member, signOut, refresh } = useSession()
  const navigate = useNavigate()
  const [me, setMe] = useState<(Member & { counts?: any }) | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [code, setCode] = useState('')
  const [hint, setHint] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [penPal, setPenPal] = useState<string | null>(null)
  const [msg2, setMsg2] = useState('')

  useEffect(() => {
    apiHome().then((d) => setPenPal(d.penPalNickname)).catch(() => {})
    apiMe()
      .then((m) => {
        setMe(m)
        setHint(m.codeHint || '')
      })
      .catch(() => {})
  }, [])

  const verify = async () => {
    setBusy(true)
    setMsg('')
    try {
      const res = await apiRecover(code.trim())
      if (res.member.id !== member?.id) {
        setMsg('这个恢复码对应的是另一个身份')
      } else {
        localStorage.setItem(TOKEN_KEY, res.token)
        setShowCode(false)
        setMsg('恢复码没问题，已经帮你保管好了')
      }
    } catch (e) {
      setMsg(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const counts = me?.counts ?? {}

  return (
    <Shell>
      <div className="pt-3 safe-top">
        <header className="pb-6 pt-8">
          <div className="text-[11px] tracking-[0.28em] text-[#a0a9a2]">我</div>
          <h1 className="mt-2 text-[24px] text-[#2C3E35]">这是你在慢信的样子</h1>
        </header>

        <div className="card-soft relative overflow-hidden px-5 py-6">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#eae1d1]/60 blur-xl" />
          <div className="relative flex items-center gap-4">
            <WaxSeal className="h-14 w-14 shrink-0 text-[14px]" label={member?.nickname?.slice(0, 1) ?? '慢'} />
            <div className="min-w-0">
              <div className="text-[20px] text-[#2C3E35]">{member?.nickname}</div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[12px] text-[#8a948d]">
                {(member?.moods ?? []).map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-1 border-t border-[#eee5d6] pt-5">
            <Cell n={counts.sent ?? 0} label="寄出" />
            <Cell n={counts.inTransit ?? 0} label="在途" />
            <Cell n={counts.deliverable ?? 0} label="可拆" />
            <Cell n={counts.read ?? 0} label="拆开" />
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 px-1 text-[13px] tracking-[0.12em] text-[#7a857e]">配对</h2>
          <div className="rounded-[18px] border border-[#e4dbcb] bg-[#faf7f1] px-5 py-5">
            <p className="text-[13px] leading-[1.9] text-[#7a857e]">
              {penPal ? `现在和「${penPal}」互相通信。` : '还没有配对，系统正在按心情为你找人。'}
              {penPal && ' 解除后你们都会重新进入匹配。'}
            </p>
            {penPal && (
              <button
                onClick={async () => {
                  setMsg2('正在解除…')
                  try {
                    const r = await apiDissolve()
                    setMsg2(r.message)
                    apiHome().then((d) => setPenPal(d.penPalNickname))
                  } catch (e) {
                    setMsg2(errText(e))
                  }
                }}
                className="tap mt-3 rounded-full border border-[#c9b9a8] px-4 py-1.5 text-[12.5px] text-[#a9705c]"
              >
                解除配对
              </button>
            )}
            {msg2 && <p className="mt-2.5 text-[12.5px] text-[#a9705c]">{msg2}</p>}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 px-1 text-[13px] tracking-[0.12em] text-[#7a857e]">恢复码</h2>
          <div className="rounded-[18px] border border-[#e4dbcb] bg-[#faf7f1] px-5 py-5">
            {!showCode ? (
              <>
                <p className="text-[13px] leading-[1.9] text-[#7a857e]">
                  我们没留你的手机号。想换设备或者清了浏览器，只能靠这串码找回身份。
                </p>
                <button
                  onClick={() => setShowCode(true)}
                  className="tap mt-4 rounded-full border border-[#2C3E35] px-5 py-2 text-[13px] text-[#2C3E35]"
                >
                  查看并核对
                </button>
                {hint && <span className="ml-3 text-[12px] text-[#a8b0a9]">开头是 {hint}…</span>}
              </>
            ) : (
              <>
                <p className="text-[13px] leading-[1.9] text-[#7a857e]">
                  为了确认这是你本人，把完整的恢复码输一遍，我们就显示出来。
                </p>
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setMsg('')
                  }}
                  placeholder="XXXXX"
                  className="mt-3 w-full rounded-[12px] border border-[#ddd3c1] bg-[#f5f0e8] px-3.5 py-3 text-center font-mono text-[15px] tracking-[0.1em] text-[#2C3E35] outline-none focus:border-[#9aa89f]"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={verify}
                    disabled={busy || !code.trim()}
                    className="tap rounded-full bg-[#2C3E35] px-5 py-2 text-[13px] text-[#F7F2E9] disabled:opacity-40"
                  >
                    {busy ? '核对中…' : '核对'}
                  </button>
                  <button onClick={() => setShowCode(false)} className="tap px-3 text-[13px] text-[#8a948d]">
                    算了
                  </button>
                </div>
              </>
            )}
            {msg && <p className="mt-3 text-[12.5px] text-[#a9705c]">{msg}</p>}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 px-1 text-[13px] tracking-[0.12em] text-[#7a857e]">关于这里</h2>
          <div className="space-y-3 rounded-[18px] border border-[#e4dbcb] bg-[#faf7f1] px-5 py-5 text-[13px] leading-[1.95] text-[#7a857e]">
            <p>· 不显示已读，不显示在线。没有人会因为你没回而失望。</p>
            <p>· 信寄出后在途 5 分钟，到点才能拆。正式上线会调回 24 小时。</p>
            <p>· 一封 500 字以内。写不完的，留给下一封。</p>
          </div>
        </section>

        <div className="mt-7 flex flex-col items-center gap-4">
          {me?.createdAt && (
            <span className="text-[11.5px] text-[#b0b8b2]">这个身份建立于 {dateTime(me.createdAt)}</span>
          )}
          <button
            onClick={() => {
              signOut()
              navigate('/', { replace: true })
            }}
            className="tap rounded-full border border-[#ddd3c1] px-5 py-2 text-[13px] text-[#8a948d]"
          >
            离开这个身份
          </button>
          <button onClick={() => refresh()} className="text-[11.5px] text-[#b8bfb9] underline underline-offset-4">
            刷新一下
          </button>
        </div>
      </div>
      <BottomNav />
    </Shell>
  )
}

function Cell({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-[19px] leading-tight text-[#2C3E35]">{n}</div>
      <div className="mt-0.5 text-[11px] text-[#96a098]">{label}</div>
    </div>
  )
}
