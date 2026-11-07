import { useEffect, useRef, useState } from 'react'

/** 倒计时：返回剩余毫秒，到点自动停下 */
export function useCountdown(target: string | number | null, onDone?: () => void) {
  const [remaining, setRemaining] = useState(() =>
    target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0
  )
  const fired = useRef(false)

  useEffect(() => {
    if (!target) return
    fired.current = false
    const tick = () => {
      const left = Math.max(0, new Date(target).getTime() - Date.now())
      setRemaining(left)
      if (left === 0 && !fired.current) {
        fired.current = true
        onDone?.()
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return remaining
}

/** 把毫秒拆成 时/分/秒 */
export function splitMs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    total,
  }
}

/** 相对时间的中文描述，克制、不精确到秒 */
export function softTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} 天前`
  const date = new Date(iso)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function clockTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
