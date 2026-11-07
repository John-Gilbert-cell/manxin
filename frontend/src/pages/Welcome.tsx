import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRecover, apiRegister, errText, MOODS, type Mood } from '@/lib/api'
import { TOKEN_KEY, useSession } from '@/lib/session'
import { Shell } from '@/components/kit'
import { cn } from '@/lib/utils'

export default function Welcome() {
  const { setMember } = useSession()
  const [mode, setMode] = useState<'intro' | 'nickname' | 'moods' | 'code' | 'recover'>('intro')
  const [nickname, setNickname] = useState('')
  const [moods, setMoods] = useState<Mood[]>([])
  const [code, setCode] = useState<string | null>(null)
  const [recoverInput, setRecoverInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const toggleMood = (m: Mood) => {
    setError('')
    setMoods((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m)
      if (prev.length >= 3) return [...prev.slice(1), m]
      return [...prev, m]
    })
  }

  const register = async () => {
    if (moods.length !== 3) return setError('选 3 个标签，正好是现在的心情')
    setBusy(true)
    setError('')
    try {
      const res = await apiRegister(nickname.trim(), moods)
      localStorage.setItem(TOKEN_KEY, res.token)
      setMember(res.member)
      setCode(res.member.recoverCode || '')
      setMode('code')
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const recover = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await apiRecover(recoverInput.trim())
      localStorage.setItem(TOKEN_KEY, res.token)
      setMember(res.member)
      navigate('/home', { replace: true })
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell className="flex min-h-screen flex-col justify-center py-10" nav={false}>
      {mode === 'intro' && (
        <div className="ink-in">
          <div className="mb-9 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C3E35] text-[13px] text-[#F5F0E8]">
              慢
            </div>
            <span className="text-[15px] tracking-[0.24em] text-[#55645c]">慢 信</span>
          </div>

          <h1 className="mb-5 text-[30px] leading-[1.45] text-[#2C3E35]">
            有些话，
            <br />
            说给不认识的人
            <br />
            反而容易。
          </h1>

          <p className="mb-10 text-[15px] leading-[1.95] text-[#55645c]">
            在这里你不用是任何人的谁。
            <br />
            留一个昵称，寄一封信，等它慢慢到达。
            <br />
            不用绑手机号，没人知道你是谁。
          </p>

          <div className="mb-11 space-y-3.5 border-l border-[#d9cfbd] pl-5 text-[14px] leading-relaxed text-[#6a776f]">
            <p>信寄出后要等一会儿才能被拆开。</p>
            <p>对方看不到你有没有读过。</p>
            <p>也不会显示谁在线。</p>
          </div>

          <button
            onClick={() => setMode('nickname')}
            className="tap w-full rounded-[16px] bg-[#2C3E35] py-4 text-[16px] tracking-[0.1em] text-[#F7F2E9] shadow-[0_6px_18px_rgba(44,62,53,0.18)]"
          >
            开始写信
          </button>

          <button
            onClick={() => setMode('recover')}
            className="tap mt-4 w-full py-2 text-[14px] text-[#8a948d] underline decoration-[#cdc3b1] underline-offset-4"
          >
            我有恢复码
          </button>
        </div>
      )}

      {mode === 'nickname' && (
        <div className="ink-in">
          <BackButton onClick={() => setMode('intro')} />
          <StepMark current={1} />
          <h2 className="mb-3 mt-6 text-[24px] leading-relaxed text-[#2C3E35]">给自己起个名字</h2>
          <p className="mb-8 text-[14px] leading-relaxed text-[#6a776f]">
            不用真名。一个你喜欢的词就好。
          </p>

          <input
            autoFocus
            value={nickname}
            maxLength={12}
            onChange={(e) => {
              setNickname(e.target.value)
              setError('')
            }}
            placeholder="比如：阿默、晚风、三楼的人"
            className="w-full rounded-[14px] border border-[#ddd3c1] bg-[#FAF7F1] px-4 py-4 text-[17px] text-[#2C3E35] outline-none transition focus:border-[#9aa89f]"
          />
          <div className="mt-2 flex justify-between text-[12px] text-[#a0a9a2]">
            <span>只有收信人能看到这个名字</span>
            <span>{nickname.length}/12</span>
          </div>

          {error && <p className="mt-3 text-[13px] text-[#a8543f]">{error}</p>}

          <PrimaryButton
            className="mt-9"
            disabled={!nickname.trim()}
            onClick={() => {
              if (!nickname.trim()) return setError('先写一个名字')
              setMode('moods')
            }}
          >
            下一步
          </PrimaryButton>
        </div>
      )}

      {mode === 'moods' && (
        <div className="ink-in">
          <BackButton onClick={() => setMode('nickname')} />
          <StepMark current={2} />
          <h2 className="mb-3 mt-6 text-[24px] leading-relaxed text-[#2C3E35]">现在，是什么感觉</h2>
          <p className="mb-8 text-[14px] leading-relaxed text-[#6a776f]">选 3 个。它们会跟着你的信一起寄出去。</p>

          <div className="grid grid-cols-2 gap-3">
            {MOODS.map((m) => {
              const on = moods.includes(m)
              return (
                <button
                  key={m}
                  onClick={() => toggleMood(m)}
                  className={cn(
                    'tap rounded-[14px] border px-3 py-[18px] text-[15px] tracking-wide transition',
                    on
                      ? 'border-[#2C3E35] bg-[#2C3E35] text-[#F5F0E8]'
                      : 'border-[#ddd3c1] bg-[#FAF7F1] text-[#4b5a51]'
                  )}
                >
                  {m}
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-between text-[12px] text-[#96a098]">
            <span>已选 {moods.length} / 3</span>
            {moods.length === 3 && <span className="text-[#5d7a63]">很好，就这样</span>}
          </div>

          {error && <p className="mt-3 text-[13px] text-[#a8543f]">{error}</p>}

          <PrimaryButton className="mt-8" disabled={busy} onClick={register}>
            {busy ? '稍等…' : '建立我的身份'}
          </PrimaryButton>
        </div>
      )}

      {mode === 'code' && (
        <div className="ink-in">
          <h2 className="mb-3 mt-2 text-[24px] leading-relaxed text-[#2C3E35]">这是你的恢复码</h2>
          <p className="mb-7 text-[14px] leading-relaxed text-[#6a776f]">
            抄下来，或者截图存好。
            <br />
            以后换手机、清缓存，靠它找回你。
            <br />
            <span className="text-[#a9705c]">我们不会存你的手机号，弄丢了就真的找不回来。</span>
          </p>

          <div className="card-soft relative overflow-hidden px-5 py-7 text-center">
            <div className="mb-3 text-[11px] tracking-[0.3em] text-[#a0a9a2]">RECOVERY CODE</div>
            <div className="font-mono text-[23px] tracking-[0.14em] text-[#2C3E35]">{code}</div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => navigator.clipboard?.writeText(code || '')}
                className="tap rounded-full border border-[#ddd3c1] px-4 py-1.5 text-[12px] text-[#6a776f]"
              >
                复制
              </button>
            </div>
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full border border-dashed border-[#d9cfbd]/70" />
          </div>

          <p className="mt-4 text-center text-[12px] leading-relaxed text-[#a0a9a2]">
            五个字符，不区分大小写
          </p>

          <PrimaryButton className="mt-8" onClick={() => navigate('/home', { replace: true })}>
            收好，进去了
          </PrimaryButton>
        </div>
      )}

      {mode === 'recover' && (
        <div className="ink-in">
          <BackButton onClick={() => setMode('intro')} />
          <h2 className="mb-3 mt-6 text-[24px] leading-relaxed text-[#2C3E35]">用恢复码进来</h2>
          <p className="mb-8 text-[14px] leading-relaxed text-[#6a776f]">
            输入当初抄下来的那串字符。
            <br />
            不记得大小写没关系。
          </p>

          <input
            autoFocus
            value={recoverInput}
            onChange={(e) => {
              setRecoverInput(e.target.value.toUpperCase())
              setError('')
            }}
            placeholder="XXXXX"
            className="w-full rounded-[14px] border border-[#ddd3c1] bg-[#FAF7F1] px-4 py-4 text-center font-mono text-[18px] tracking-[0.12em] text-[#2C3E35] outline-none focus:border-[#9aa89f]"
          />

          {error && <p className="mt-3 text-center text-[13px] text-[#a8543f]">{error}</p>}

          <PrimaryButton className="mt-8" disabled={busy || !recoverInput.trim()} onClick={recover}>
            {busy ? '正在找…' : '进来'}
          </PrimaryButton>

          <p className="mt-6 text-center text-[13px] text-[#a0a9a2]">
            实在想不起来？{' '}
            <button onClick={() => setMode('nickname')} className="underline underline-offset-4">
              重新开始一个身份
            </button>
          </p>
        </div>
      )}

      <div className="mt-14 text-center text-[11px] tracking-[0.2em] text-[#b3bab4]">
        慢 信 · 匿名书信交换
      </div>
    </Shell>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'tap w-full rounded-[16px] bg-[#2C3E35] py-4 text-[16px] tracking-[0.1em] text-[#F7F2E9] transition disabled:opacity-35',
        className
      )}
    >
      {children}
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="tap -ml-1 flex items-center gap-1 text-[14px] text-[#8a948d]">
      <span className="text-[18px] leading-none">‹</span> 返回
    </button>
  )
}

function StepMark({ current }: { current: number }) {
  return (
    <div className="mt-7 flex gap-1.5">
      {[1, 2].map((i) => (
        <div
          key={i}
          className={cn('h-[2px] w-7 rounded-full', i <= current ? 'bg-[#2C3E35]' : 'bg-[#ddd3c1]')}
        />
      ))}
    </div>
  )
}
