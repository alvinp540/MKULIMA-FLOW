import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Egg,
  HeartHandshake,
  MapPin,
  Quote,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import SiteFooter from '../../components/common/SiteFooter'

const STATS = [
  { value: '1,200+', label: 'farms tracking with MkulimaFlow' },
  { value: '30%', label: 'less time on paperwork' },
  { value: '4.8/5', label: 'average farmer rating' },
]

const TESTIMONIALS = [
  {
    name: 'Grace Wanjiku',
    role: 'Layer farm · 450 birds',
    location: 'Kiambu',
    initials: 'GW',
    rating: 5,
    quote:
      'I used to write egg numbers in three different exercise books. Now I record once and the production trend is right there. I finally know which flock is actually paying for its feed.',
  },
  {
    name: 'Peter Otieno',
    role: 'Broiler farm · 800 birds',
    location: 'Kisumu',
    initials: 'PO',
    rating: 5,
    quote:
      'The feed low-stock alert has saved me twice. I get a message before a batch runs out, so I order early instead of panicking on a Sunday morning.',
  },
  {
    name: 'Mary Njeri',
    role: 'Mixed poultry · 260 birds',
    location: 'Nakuru',
    initials: 'MN',
    rating: 5,
    quote:
      'Mortality records used to be something I only thought about when numbers looked bad. Now I can see the pattern early and call the vet before it becomes a crisis.',
  },
  {
    name: 'Samuel Kiptoo',
    role: 'Layer farm · 1,000 birds',
    location: 'Eldoret',
    initials: 'SK',
    rating: 4,
    quote:
      'What I like most is that it is simple. My farm assistant learned it in one afternoon, and we both record the same way now. No more guessing whose notebook is correct.',
  },
  {
    name: 'Faith Achieng',
    role: 'Free-range eggs · 180 birds',
    location: 'Kakamega',
    initials: 'FA',
    rating: 5,
    quote:
      'The monthly summary is what I show my bank when I apply for a small loan. For the first time I have clean records that show what the farm actually earns.',
  },
  {
    name: 'Joseph Mutua',
    role: 'Broiler farm · 600 birds',
    location: 'Machakos',
    initials: 'JM',
    rating: 5,
    quote:
      'I run two sites and used to drive between them just to compare figures. Now I open the dashboard and see both farms side by side before I even leave the house.',
  },
]

const FEATURED_METRICS = [
  { icon: Egg, label: 'Egg records', value: 'Daily, in one place' },
  { icon: TrendingUp, label: 'Production trend', value: 'Up 18% in 3 months' },
  { icon: HeartHandshake, label: 'Health follow-up', value: 'Earlier vet visits' },
]

const eyebrowClass = 'text-[10px] font-extrabold uppercase tracking-[2px] text-[#b8d28e]'

function Avatar({ initials }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#b8d28e,#6e9a5b)] text-[11px] font-bold text-[#173325] ring-2 ring-white/15"
    >
      {initials}
    </span>
  )
}

export default function TestimonialsPage() {
  return (
    <>
      <main className="relative z-10 flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-[#b8d28e]/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 size-[340px] rounded-full bg-[#2f7a4e]/25 blur-3xl" />

          <div className="relative mx-auto grid w-[min(1200px,calc(100%-64px))] gap-10 py-14 max-sm:w-[calc(100%-36px)] lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-12 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[1.6px] text-white/70 backdrop-blur-md">
                <Sparkles aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Farmer stories
              </span>

              <h1 className="mt-5 font-display text-[clamp(36px,5vw,56px)] font-semibold leading-[1.05] tracking-[-1.6px] text-white">
                Real farms.
                {' '}
                <span className="text-[#c8e0a1]">Clearer decisions.</span>
              </h1>

              <p className="mt-5 max-w-[560px] text-[14px] leading-[1.8] text-white/70">
                Poultry farmers across Kenya use MkulimaFlow to replace scattered
                notebooks with records they can actually use. Here is what changed for
                them.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {STATS.map(({ value, label }) => (
                <div
                  className="rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-4 text-center backdrop-blur-md sm:px-4"
                  key={label}
                >
                  <p className="font-display text-[clamp(20px,2.4vw,28px)] font-semibold tracking-[-0.8px] text-[#c8e0a1]">
                    {value}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-[1.5] text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-label="Farmer testimonials"
          className="mx-auto w-[min(1200px,calc(100%-64px))] pb-12 max-sm:w-[calc(100%-36px)]"
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, location, initials, rating, quote }) => (
              <figure
                className="relative flex flex-col rounded-[24px] border border-white/12 bg-white/[0.05] p-6 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-[#b8d28e]/30 hover:bg-white/[0.075]"
                key={name}
              >
                <Quote
                  aria-hidden="true"
                  className="text-[#b8d28e]/35"
                  size={26}
                  strokeWidth={1.8}
                />
                <div className="mt-3 flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      aria-hidden="true"
                      className={index < rating ? 'text-[#e8c56a]' : 'text-white/15'}
                      fill="currentColor"
                      key={index}
                      size={12}
                      strokeWidth={0}
                    />
                  ))}
                </div>

                <blockquote className="mt-3 flex-1 text-[12px] leading-[1.75] text-white/65">
                  “{quote}”
                </blockquote>

                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  <Avatar initials={initials} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white">
                      {name}
                      <BadgeCheck
                        aria-hidden="true"
                        className="shrink-0 text-[#b8d28e]"
                        size={13}
                      />
                    </p>
                    <p className="text-[10.5px] text-white/45">{role}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-white/35">
                      <MapPin aria-hidden="true" size={10} />
                      {location}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] pb-12 max-sm:w-[calc(100%-36px)]">
          <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[linear-gradient(120deg,rgba(30,86,52,0.85),rgba(11,32,23,0.92))] p-7 shadow-[0_24px_60px_rgba(4,18,12,0.35)] backdrop-blur-xl sm:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#b8d28e]/15 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <p className={eyebrowClass}>Featured story</p>
                <h2 className="mt-3 font-display text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.12] tracking-[-1px] text-white">
                  “I stopped guessing and started seeing the whole farm.”
                </h2>
                <blockquote className="mt-4 max-w-[620px] text-[13px] leading-[1.8] text-white/65">
                  Grace kept 450 layers in Kiambu and tracked everything by hand. After
                  three months of daily records in MkulimaFlow, she spotted a feed batch
                  that was quietly eating her margin and moved the flock to a cheaper
                  supplier without losing production.
                </blockquote>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar initials="GW" />
                  <div>
                    <p className="text-[12.5px] font-semibold text-white">Grace Wanjiku</p>
                    <p className="text-[10.5px] text-white/45">
                      Layer farm · Kiambu, Kenya
                    </p>
                  </div>
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {FEATURED_METRICS.map(({ icon: Icon, label, value }) => (
                  <li
                    className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3.5"
                    key={label}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#b8d28e]/25 bg-[#b8d28e]/10 text-[#c6dfa0]">
                      <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[1.2px] text-white/40">
                        {label}
                      </p>
                      <p className="mt-0.5 text-[12px] font-semibold text-white">{value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] pb-16 max-sm:w-[calc(100%-36px)]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-md sm:p-8">
            <h2 className="font-display text-[clamp(24px,2.8vw,32px)] font-semibold leading-[1.15] tracking-[-0.9px] text-white">
              Your farm story starts with a free month.
            </h2>
            <p className="mx-auto mt-2 max-w-[520px] text-[12.5px] leading-[1.7] text-white/55">
              No card required. Set up your flocks, record your first eggs, and see how
              much clearer the day-to-day can feel.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] no-underline transition hover:-translate-y-0.5 hover:bg-[#c9e0a3]"
                to="/signup"
              >
                Start free trial
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <Link
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-[12.5px] font-semibold text-white/85 no-underline transition hover:border-white/35 hover:bg-white/[0.11] hover:text-white"
                to="/pricing"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
