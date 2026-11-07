import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 部分网关会剥离 Authorization 头，改用自定义头 + cookie 双保险
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('manxin_token')
  if (token) {
    config.headers['X-Auth-Token'] = token
    document.cookie = `manxin_token=${encodeURIComponent(token)}; path=/; max-age=31536000; samesite=lax`
  }
  return config
})

export const errText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as any)?.message || '网络好像不太好，再试一次'
  }
  return e instanceof Error ? e.message : '出了点小问题'
}

// ---------- 类型 ----------

export type Mood = '累' | '想被听见' | '深夜不睡' | '想家' | '中年沉默' | '刚挂了电话'

export const MOODS: Mood[] = ['累', '想被听见', '深夜不睡', '想家', '中年沉默', '刚挂了电话']

export interface Member {
  id: number
  nickname: string
  recoverCode?: string
  codeHint?: string
  moods: Mood[]
  createdAt: string
}

export interface Letter {
  id: number
  title: string
  status: 'pending' | 'in_transit' | 'delivered' | 'read'
  senderNickname: string
  moods?: Mood[]
  sentAt: string
  openAt: string
  isMine: boolean
  unlocked: boolean
  countdownMs: number
  body: string | null
  peerNickname: string | null
  repliedToId: number | null
  hasReply: boolean
}

export interface Limits {
  transitMinutes: number
  receiveWaitSec: number
}

export interface HomeData {
  member: { nickname: string }
  counts: {
    inTransit: number
    deliverable: number
    read: number
    sentInTransit: number
    pending: number
  }
  matchState: 'matched' | 'waiting'
  penPalNickname: string | null
  justMatched: boolean
  canWrite: boolean
  writeState: 'waiting' | 'stranger_sent' | 'in_transit' | 'ready'
  limits?: Limits
  letters: Letter[]
  latest: Letter[]
}

// ---------- 接口 ----------

export const apiRegister = (nickname: string, moods: Mood[]) =>
  api.post<{ token: string; member: Member }>('/member/register', { nickname, moods }).then((r) => r.data)

export const apiRecover = (code: string) =>
  api.post<{ token: string; member: Member }>('/member/recover', { code }).then((r) => r.data)

export const apiMe = () => api.get<Member & { counts: any }>('/member/me').then((r) => r.data)

export const apiHome = () => api.get<HomeData>('/letters/home').then((r) => r.data)

export const apiSend = (body: string) =>
  api
    .post<{ id: number; openAt: string; receiveWaitSec: number; pending: boolean }>('/letters', { body })
    .then((r) => r.data)

export const apiDissolve = () =>
  api.post<{ ok: boolean; message: string }>('/letters/pair/dissolve').then((r) => r.data)

export const apiLetter = (id: number) => api.get<Letter>(`/letters/${id}`).then((r) => r.data)

export const apiOpen = (id: number) =>
  api
    .post<{ id: number; title: string; body: string; senderNickname: string; sentAt: string }>(
      `/letters/${id}/open`
    )
    .then((r) => r.data)

export const apiReply = (id: number, body: string) =>
  api.post<{ id: number; openAt: string }>(`/letters/${id}/reply`, { body }).then((r) => r.data)

export const apiSent = () => api.get<Letter[]>('/letters/sent/list').then((r) => r.data)
