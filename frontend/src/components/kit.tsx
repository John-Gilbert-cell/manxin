import { cn } from '@/lib/utils'

/** 信封图形：用于首页与卡片，纯 CSS 绘制 */
export function EnvelopeArt({
  className,
  state = 'sealed',
}: {
  className?: string
  state?: 'sealed' | 'opened' | 'traveling'
}) {
  return (
    <div className={cn('relative', className)}>
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[10px] border border-[#d8cdb9] bg-[#f7f2e8] shadow-[0_2px_6px_rgba(44,62,53,0.08)]">
        {/* 信封背面 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f9f5ec] to-[#eee6d7]" />

        {state === 'opened' ? (
          <>
            {/* 打开的上盖 */}
            <div
              className="absolute inset-x-0 top-0 h-[45%] origin-top bg-[#efe6d5]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
            />
            {/* 露出的信纸 */}
            <div className="absolute inset-x-[12%] top-[14%] h-[62%] rounded-[3px] bg-[#fdfaf4] shadow-[0_1px_4px_rgba(44,62,53,0.12)]">
              <div className="px-3 pt-3">
                <div className="rule-dashed mb-2" />
                <div className="rule-dashed mb-2" />
                <div className="rule-dashed mb-2 w-3/4" />
              </div>
            </div>
            <div
              className="absolute inset-x-0 bottom-0 h-[58%] bg-[#f3ebdc]"
              style={{ clipPath: 'polygon(0 100%, 0 18%, 50% 72%, 100% 18%, 100% 100%)' }}
            />
          </>
        ) : (
          <>
            {/* 侧边折角 */}
            <div
              className="absolute inset-0 bg-[#f1e8d8]"
              style={{ clipPath: 'polygon(0 100%, 0 22%, 50% 74%, 100% 22%, 100% 100%)' }}
            />
            {/* 上盖 */}
            <div
              className="absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-[#eee5d4] to-[#e6dbc6]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
            />
            {/* 火漆 */}
            <div className="wax-seal absolute left-1/2 top-[48%] h-[22%] w-[15%] -translate-x-1/2 -translate-y-1/2 text-[7px]">
              慢
            </div>
          </>
        )}

        {/* 邮票 */}
        <div className="absolute right-2 top-2 h-[22%] w-[16%] rounded-[2px] border border-[#cbbfa9] bg-[#f3e9d8]">
          <div className="m-[2px] h-[calc(100%-4px)] border border-dashed border-[#c9bda7]/70" />
        </div>

        {state === 'traveling' && (
          <div className="absolute inset-x-0 bottom-[14%] h-[2px] overflow-hidden">
            <div className="h-full w-1/4 rounded-full bg-[#a9705c]/35" style={{ animation: 'travel 3.4s linear infinite' }} />
          </div>
        )}
      </div>
    </div>
  )
}

/** 信鸽叼信飞翔：纯 SVG，配色随纸墨主题 */
export function PigeonArt({ className, drift = false }: { className?: string; drift?: boolean }) {
  return (
    <div className={cn('relative', drift && 'pigeon-drift', className)}>
      <svg viewBox="0 0 120 90" className="pigeon-glide w-full">
        {/* 信封（鸽子叼着） */}
        <g transform="rotate(8 26 62)">
          <rect x="8" y="56" width="34" height="22" rx="2.5" fill="#F3EADA" stroke="#CFC2A8" strokeWidth="1" />
          <path d="M8 58 L25 71 L42 58" fill="none" stroke="#CFC2A8" strokeWidth="1" />
          <rect x="34" y="59" width="6" height="7" rx="0.8" fill="#E4D6BC" stroke="#C4B69C" strokeWidth="0.6" />
        </g>
        {/* 尾羽 */}
        <path d="M86 40 L104 34 L102 44 L88 47 Z" fill="#8B9489" />
        {/* 身体 */}
        <path
          d="M38 46 C46 32, 72 28, 86 38 C92 42, 92 48, 86 52 C74 60, 50 60, 40 52 C36 49, 36 48, 38 46 Z"
          fill="#5D7A63"
        />
        {/* 头 */}
        <circle cx="40" cy="40" r="8.5" fill="#4C6553" />
        {/* 眼睛 */}
        <circle cx="37.5" cy="38.5" r="1.3" fill="#F5F0E8" />
        {/* 喙（衔着信封绳） */}
        <path d="M33 42 L27 44 L33 46 Z" fill="#C2915A" />
        <line x1="25" y1="60" x2="26" y2="45" stroke="#A98B62" strokeWidth="1" />
        {/* 胸腹 */}
        <path d="M44 52 C50 58, 66 58, 74 52 C68 60, 50 62, 44 52 Z" fill="#7C9580" opacity="0.7" />
        {/* 翅膀（扇动） */}
        <g className="pigeon-wing">
          <path
            d="M60 40 C70 26, 92 22, 98 30 C90 32, 78 38, 68 46 C64 48, 60 46, 60 40 Z"
            fill="#43594B"
            opacity="0.92"
          />
        </g>
        {/* 脚 */}
        <path d="M62 57 L60 62 M66 57 L66 62" stroke="#C2915A" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/** 火漆印 */
export function WaxSeal({ label = '慢', className }: { label?: string; className?: string }) {
  return <div className={cn('wax-seal h-11 w-11 text-[13px]', className)}>{label}</div>
}

/** 状态小药丸 */
export function StatusPill({
  tone,
  children,
}: {
  tone: 'transit' | 'ready' | 'read' | 'quiet'
  children: React.ReactNode
}) {
  const map = {
    transit: 'bg-[#efe6d5] text-[#8a6a3c] border-[#e2d3b8]',
    ready: 'bg-[#e5ebe3] text-[#3f5a48] border-[#cfdbd2]',
    read: 'bg-[#eeeae2] text-[#7b857e] border-[#dfd8cb]',
    quiet: 'bg-transparent text-[#8a948d] border-[#ddd4c4]',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[11px] tracking-wide',
        map[tone]
      )}
    >
      {children}
    </span>
  )
}

/** 页面骨架：统一手机宽度、居中、底部导航留白 */
export function Shell({
  children,
  className,
  nav = true,
}: {
  children: React.ReactNode
  className?: string
  nav?: boolean
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[520px] px-5', nav && 'pb-28', className)}>{children}</div>
  )
}
