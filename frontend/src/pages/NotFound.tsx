import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 text-[11px] tracking-[0.3em] text-[#b0b8b2]">404</div>
      <h1 className="text-[20px] leading-relaxed text-[#2C3E35]">这封信不在这里</h1>
      <p className="mt-3 text-[13.5px] leading-[1.95] text-[#8a948d]">
        可能地址抄错了，也可能它已经被人取走了。
      </p>
      <Link
        to="/home"
        className="tap mt-8 rounded-full border border-[#2C3E35] px-6 py-2.5 text-[13.5px] text-[#2C3E35]"
      >
        回信箱
      </Link>
    </div>
  )
}
