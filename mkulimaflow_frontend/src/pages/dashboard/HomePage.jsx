import {BadgeCheck , CircleCheck} from 'lucide-react'
import useAuth from '../../hooks/useAuth'

export default function HomePage() {
  const { user } = useAuth()
  const role = user.role === 'farmer' ? 'Farmer' : user.role === 'buyer' ? 'Buyer' : 'Member'

  return (
    <main className="mx-auto my-[47px] min-h-[calc(100vh-151px)] w-[min(1040px,calc(100%-48px))] max-sm:my-[25px] max-sm:w-[calc(100%-32px)]">
      <section className="relative flex min-h-[310px] items-center overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_81%_50%,rgba(200,218,164,0.13),transparent_25%),linear-gradient(120deg,#214a34,#315c3f)] px-[55px] py-[51px] text-white max-sm:min-h-[280px] max-sm:px-[25px] max-sm:py-8">
        <div className="relative z-[1] max-w-[620px]">
          <span className="text-[10px] font-extrabold tracking-[1.75px] text-[#bdd298]">YOUR MKULIMAFLOW</span>
          <h1 className="mb-3.5 mt-3.5 max-w-[600px] font-display text-[clamp(35px,5vw,55px)] font-semibold leading-[1.08] tracking-[-2px]">
            Welcome to your next growing connection, {user.username}.
          </h1>
          <p className="text-sm leading-[1.7] text-white/75">
            You are signed in as a <strong className="text-[#e3edcc]">{role}</strong>. Your MkulimaFlow account is ready.
          </p>
        </div>
    <div className="pointer-events-none absolute right-[8%] text-[220px] leading-none text-white/[0.17] max-sm:-bottom-8 max-sm:-right-3 max-sm:text-[165px]" aria-hidden="true"><BadgeCheck className="size-70 text-grey-20 " /></div>
      </section>

      <section className="mt-[18px] flex items-center gap-[15px] rounded-[15px] border border-[#e8e8de] bg-white px-7 py-6 max-sm:flex-wrap max-sm:px-4 max-sm:py-[18px]">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e9f1e4] text-lg font-bold text-[#3b764f]" aria-hidden="true"><CircleCheck /></div>
        <div>
          <h2 className="mb-1 text-sm font-bold text-[#252d25]">You are all connected</h2>
          <p className="text-xs text-[#7d8479]">Your account is securely connected to MkulimaFlow.</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-[9px] rounded-full bg-[#f1f5ee] px-[11px] py-2 text-[11px] font-bold text-[#55705a] max-sm:ml-[55px]">
          <span className="size-2 rounded-full bg-[#5da77b]" />
          Connected
        </span>
      </section>
    </main>
  )
}
