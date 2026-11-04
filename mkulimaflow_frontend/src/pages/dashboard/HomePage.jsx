import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Bird,
  CalendarDays,
  Egg,
  HeartPulse,
  Wheat,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'

const metrics = [
  { label: 'Active flock', value: '0', detail: 'birds on this farm', icon: Bird, tone: 'green' },
  { label: 'Eggs collected', value: '0', detail: 'collected today', icon: Egg, tone: 'amber' },
  { label: 'Feed on hand', value: '0 kg', detail: 'across your inventory', icon: Wheat, tone: 'blue' },
  { label: 'Health checks', value: '0', detail: 'attention needed', icon: HeartPulse, tone: 'rose' },
]

const iconStyles = {
  green: 'bg-[#edf4e7] text-[#52794b]',
  amber: 'bg-[#fbf2df] text-[#a47b35]',
  blue: 'bg-[#eaf1f5] text-[#587b91]',
  rose: 'bg-[#f8ece8] text-[#a56a58]',
}

export default function HomePage() {
  const { user } = useAuth()
  const { farm } = useOutletContext()
  const [date] = useState(() => new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()))
  const firstName = user?.username?.split(/[ ._-]/)[0] || 'there'

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#78877a]">
            <CalendarDays aria-hidden="true" size={14} />
            {date}
          </div>
          <h1 className="font-display text-[clamp(25px,3vw,34px)] font-bold leading-tight tracking-[-1.2px] text-[#26352b]">
            Good to see you, {firstName}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#7b887e]">
            Here is what is happening at <span className="font-semibold text-[#526458]">{farm}</span>.
          </p>
        </div>
        
      </section>

      <section aria-label="Poultry farm summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="rounded-2xl border border-[#e9ece5] bg-white p-5 shadow-[0_2px_8px_rgba(34,54,39,0.025)]" key={label}>
            <div className="flex items-start justify-between">
              <span className={`grid size-10 place-items-center rounded-xl ${iconStyles[tone]}`}>
                <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-5 text-[12px] font-medium text-[#78857b]">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-[27px] font-bold tracking-[-1px] text-[#2c3a30]">{value}</p>
              <span className="text-[10px] text-[#9aa39a]">{detail}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
        <article className="relative min-h-[300px] overflow-hidden rounded-2xl border border-[#e9ece5] bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-[#334238]">Egg production</h2>
              <p className="mt-1 text-[11px] text-[#8a958b]">Daily collection · Last 7 days</p>
            </div>
            <span className="rounded-lg border border-[#e9ece5] px-3 py-1.5 text-[10px] font-semibold text-[#768378]">This week</span>
          </div>
          <div className="mt-7 flex h-[168px] items-end justify-between gap-2 border-b border-[#edf0eb] px-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={`${day}-${index}`}>
                <span className="min-h-1 w-full max-w-[36px] rounded-t-md bg-[#edf3e8]" style={{ height: '6%' }} />
                <span className="pb-2 text-[10px] text-[#929d93]">{day}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-[#929d93]">coming soon.</p>
        </article>

        <article className="flex min-h-[300px] flex-col rounded-2xl bg-[#1f3b2d] p-6 text-white sm:p-7">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-[#c8dda6]">
            <Bird aria-hidden="true" size={20} />
          </span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[1.4px] text-[#c8dda6]">A good place to start</p>
          <h2 className="mt-2 max-w-[280px] font-display text-[21px] font-semibold leading-snug tracking-[-0.5px]">
            Your poultry journey starts with a flock.
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/65">
            Once flock management is ready, you’ll be able to keep bird records, track egg collection, and stay on top of flock health here.
          </p>
          <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] font-medium text-white/75">
            <span className="size-1.5 rounded-full bg-[#c8dda6]" />
            Flock management is coming soon
          </div>
        </article>
      </section>
    </div>
  )
}
