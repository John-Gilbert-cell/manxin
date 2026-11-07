import { useCallback, useState } from 'react'
import { api } from '@/lib/api'

type MemberRow = {
  id: number
  nickname: string
  moods: string[]
  createdAt: string
  sentCount: number
  receivedCount: number
  inTransit: number
  inPool: boolean
  peers: string | null
}

type LetterRow = {
  id: number
  title: string
  excerpt: string
  status: string
  senderNickname: string
  recipientNickname: string | null
  sentAt: string
  openAt: string
}

const KEY_STORE = 'manxin_admin_key'

export default function Admin() {
  const [key, setKey] = useState(localStorage.getItem(KEY_STORE) || '')
  const [authed, setAuthed] = useState(false)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [letters, setLetters] = useState<LetterRow[]>([])
  const [tab, setTab] = useState<'match' | 'letters'>('match')
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async (k: string) => {
    setErr('')
    try {
      const [m, l] = await Promise.all([
        api.get<MemberRow[]>('/admin/members', { headers: { 'x-admin-key': k } }),
        api.get<LetterRow[]>('/admin/letters', { headers: { 'x-admin-key': k } }),
      ])
      setMembers(m.data)
      setLetters(l.data)
      setAuthed(true)
      localStorage.setItem(KEY_STORE, k)
    } catch (e: any) {
      setAuthed(false)
      setErr(e?.response?.data?.message || '口令不对')
    }
  }, [])



  const pair = async () => {
    if (!a || !b) return setMsg('选两个人')
    setBusy(true)
    setMsg('')
    try {
      await api.post('/admin/pair', { a, b }, { headers: { 'x-admin-key': key } })
      setMsg(`已配对：${members.find((m) => m.id === a)?.nickname} ↔ ${members.find((m) => m.id === b)?.nickname}`)
      setA(null)
      setB(null)
      await load(key)
    } catch (e: any) {
      setMsg(e?.response?.data?.message || '配对失败')
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
        <div className="mb-6 text-[11px] tracking-[0.3em] text-[#b0b8b2]">慢信 · 后 台</div>
        <h1 className="mb-6 text-[20px] text-[#2C3E35]">配对台</h1>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="管理口令"
          className="w-full rounded-[12px] border border-[#ddd3c1] bg-[#faf7f1] px-4 py-3 text-[15px] text-[#2C3E35] outline-none"
        />
        {err && <p className="mt-3 text-[13px] text-[#a8543f]">{err}</p>}
        <button
          onClick={() => void load(key)}
          className="tap mt-4 rounded-[14px] bg-[#2C3E35] py-3.5 text-[15px] text-[#F7F2E9]"
        >
          进入
        </button>
      </div>
    )
  }

  const pool = members.filter((m) => m.inPool)
  const singles = members.filter((m) => !m.peers)

  return (
    <div className="mx-auto min-h-screen max-w-[900px] px-5 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] tracking-[0.3em] text-[#b0b8b2]">慢信 · 后 台</div>
          <h1 className="mt-1.5 text-[22px] text-[#2C3E35]">配对台</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('match')}
            className={`tap rounded-full px-4 py-1.5 text-[13px] ${tab === 'match' ? 'bg-[#2C3E35] text-[#F7F2E9]' : 'border border-[#ddd3c1] text-[#7a857e]'}`}
          >
            成员 {members.length}
          </button>
          <button
            onClick={() => setTab('letters')}
            className={`tap rounded-full px-4 py-1.5 text-[13px] ${tab === 'letters' ? 'bg-[#2C3E35] text-[#F7F2E9]' : 'border border-[#ddd3c1] text-[#7a857e]'}`}
          >
            信件 {letters.length}
          </button>
        </div>
      </header>

      {tab === 'match' && (
        <>
          <div className="mb-6 rounded-[16px] border border-[#e4dbcb] bg-[#faf7f1] p-5">
            <div className="mb-3 text-[13px] text-[#7a857e]">
              手动配对：选两个人，双方会立刻成为笔友，并各自收到一封「邮差」的介绍信。
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={a} onChange={setA} members={members} placeholder="选择 A" />
              <span className="text-[#b0b8b2]">↔</span>
              <Select value={b} onChange={setB} members={members} placeholder="选择 B" />
              <button
                onClick={pair}
                disabled={busy || !a || !b || a === b}
                className="tap rounded-full bg-[#2C3E35] px-6 py-2.5 text-[13.5px] text-[#F7F2E9] disabled:opacity-35"
              >
                {busy ? '配对中…' : '确认配对'}
              </button>
            </div>
            {msg && <p className="mt-3 text-[13px] text-[#5d7a63]">{msg}</p>}
            <p className="mt-3 text-[12px] text-[#a8b0a9]">
              待配对 {pool.length} 人 · 尚无人通信 {singles.length} 人
            </p>
          </div>

          <div className="overflow-hidden rounded-[16px] border border-[#e4dbcb] bg-[#faf7f1]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#f3ecdf] text-[12px] text-[#8a948d]">
                <tr>
                  <th className="px-4 py-2.5 font-normal">昵称</th>
                  <th className="px-4 py-2.5 font-normal">心情</th>
                  <th className="px-4 py-2.5 font-normal">笔友</th>
                  <th className="px-4 py-2.5 font-normal">寄/收</th>
                  <th className="px-4 py-2.5 font-normal">在途</th>
                  <th className="px-4 py-2.5 font-normal">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d6]">
                {members.map((m) => (
                  <tr key={m.id} className={m.inPool ? 'bg-[#f7f1e5]' : ''}>
                    <td className="px-4 py-2.5 text-[#2C3E35]">{m.nickname}</td>
                    <td className="px-4 py-2.5 text-[#8a948d]">{m.moods.join('、')}</td>
                    <td className="px-4 py-2.5 text-[#55645c]">{m.peers || '—'}</td>
                    <td className="px-4 py-2.5 text-[#55645c]">
                      {m.sentCount} / {m.receivedCount}
                    </td>
                    <td className="px-4 py-2.5 text-[#8a6a3c]">{m.inTransit || '—'}</td>
                    <td className="px-4 py-2.5">
                      {m.inPool ? (
                        <span className="text-[#a9705c]">待配对</span>
                      ) : m.peers ? (
                        <span className="text-[#5d7a63]">已配对</span>
                      ) : (
                        <span className="text-[#b0b8b2]">新</span>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#a8b0a9]">
                      还没有人注册
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'letters' && (
        <div className="space-y-3">
          {letters.map((l) => (
            <div key={l.id} className="rounded-[14px] border border-[#e4dbcb] bg-[#faf7f1] px-4 py-3">
              <div className="flex items-center justify-between text-[12px] text-[#8a948d]">
                <span>
                  #{l.id} · {l.senderNickname} → {l.recipientNickname || '（已注销）'}
                </span>
                <span
                  className={
                    l.status === 'in_transit' ? 'text-[#b98b4e]' : l.status === 'read' ? 'text-[#a8b0a9]' : 'text-[#5d7a63]'
                  }
                >
                  {l.status}
                </span>
              </div>
              <div className="mt-1 text-[14px] text-[#2C3E35]">{l.title || '（无题）'}</div>
              <div className="mt-1 line-clamp-1 text-[12.5px] text-[#96a098]">{l.excerpt}</div>
            </div>
          ))}
          {letters.length === 0 && <p className="py-16 text-center text-[13px] text-[#a8b0a9]">还没有信</p>}
        </div>
      )}
    </div>
  )
}

function Select({
  value,
  onChange,
  members,
  placeholder,
}: {
  value: number | null
  onChange: (v: number | null) => void
  members: MemberRow[]
  placeholder: string
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="rounded-[10px] border border-[#ddd3c1] bg-[#f5f0e8] px-3 py-2 text-[13.5px] text-[#2C3E35] outline-none"
    >
      <option value="">{placeholder}</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nickname} #{m.id}
        </option>
      ))}
    </select>
  )
}
