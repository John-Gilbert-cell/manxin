import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const { pathname } = useLocation()
  const items = [
    { to: '/home', label: '信箱', icon: '✉' },
    { to: '/write', label: '写信', icon: '✎' },
    { to: '/me', label: '我', icon: '◍' },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 safe-bottom">
      <div className="mx-auto max-w-[520px] px-4 pb-3">
        <div className="flex items-center justify-around rounded-[20px] border border-[#e4dbcb] bg-[#faf7f1]/95 px-2 py-2 shadow-[0_-2px_20px_rgba(44,62,53,0.07)] backdrop-blur">
          {items.map((it) => {
            const active = pathname === it.to
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  'tap flex flex-1 flex-col items-center gap-0.5 rounded-[14px] py-1.5',
                  active ? 'text-[#2C3E35]' : 'text-[#a0a9a2]'
                )}
              >
                <span className="text-[17px] leading-none">{it.icon}</span>
                <span className="text-[11px] tracking-wide">{it.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
