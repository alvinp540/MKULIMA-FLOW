import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bird,
  Boxes,
  Check,
  ClipboardList,
  Egg,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react'
import SiteFooter from '../../components/common/SiteFooter'

const FEATURES = [
  {
    icon: Bird,
    title: 'Poultry management',
    description: 'Keep every flock, breed, and housing unit organised in one place.',
    points: ['Flock profiles & breeds', 'Housing and suppliers', 'Status at a glance'],
  },
  {
    icon: Egg,
    title: 'Egg production',
    description: 'Record daily collections and watch production change over time.',
    points: ['Daily collection records', 'Production trends', 'Flock-level performance'],
  },
  {
    icon: Boxes,
    title: 'Feed inventory',
    description: 'Stay ahead of feed costs, usage, and unexpected stock-outs.',
    points: ['Stock by feed type', 'Purchases & usage', 'Low-stock visibility'],
  },
  {
    icon: ShieldCheck,
    title: 'Healthcare',
    description: 'Treatments, vaccinations, and mortality records kept together.',
    points: ['Vaccination schedules', 'Treatment records', 'Mortality tracking'],
  },
  {
    icon: ClipboardList,
    title: 'Health reports',
    description: 'Turn everyday records into clear, useful farm reports.',
    points: ['Health summaries', 'Mortality insights', 'Vet visit history'],
  },
  {
    icon: Settings,
    title: 'Farm workspace',
    description: 'Set up your farm once and keep your account protected.',
    points: ['Farm profile settings', 'Secure sign-in', 'One clear workspace'],
  },
]

const STEPS = [
  {
    title: 'Create your account',
    description: 'Sign up as a farmer in under a minute — no paperwork, no spreadsheets.',
  },
  {
    title: 'Set up your farm',
    description: 'Add your farm, flocks, breeds, and housing units so everything has a home.',
  },
  {
    title: 'Track every day',
    description: 'Log eggs, feed, and health records. Watch reports build themselves.',
  },
]

const CHART = [42, 66, 54, 78, 61, 88, 73]

const REASONS = [
  'One workspace instead of scattered notebooks',
  'Simple enough to use in the field',
  'Records that stay organised as the farm grows',
  'Clear reports for better decisions',
]

const eyebrowClass = 'text-[10px] font-extrabold uppercase tracking-[2px] text-[#b8d28e]'

export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-40 size-[420px] rounded-full bg-[#b8d28e]/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 size-[360px] rounded-full bg-[#2f7a4e]/25 blur-3xl" />

          <div className="relative mx-auto grid w-[min(1200px,calc(100%-64px))] gap-12 py-14 max-sm:w-[calc(100%-36px)] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[1.6px] text-white/70 backdrop-blur-md">
                <Sparkles aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Poultry management system
              </span>

              <h1 className="mt-5 font-display text-[clamp(38px,5.2vw,60px)] font-semibold leading-[1.03] tracking-[-1.8px] text-white">
                Run your poultry farm
                {' '}
                <span className="text-[#c8e0a1]">with confidence.</span>
              </h1>

              <p className="mt-5 max-w-[520px] text-[14.5px] leading-[1.8] text-white/70">
                MkulimaFlow brings your flocks, egg production, feed inventory, and
                healthcare records together — so you spend less time on paperwork and
                more time with your birds.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-[#b8d28e] px-6 text-[13px] font-bold text-[#173325] no-underline shadow-[0_10px_26px_rgba(9,28,19,0.3)] transition hover:-translate-y-0.5 hover:bg-[#c9e0a3]"
                  to="/signup"
                >
                  Create free account
                  <ArrowRight aria-hidden="true" size={15} />
                </Link>
                <a
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-6 text-[13px] font-semibold text-white/85 no-underline backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.11] hover:text-white"
                  href="#features"
                >
                  Explore features
                </a>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-white/55">
                {['Farmer-first design', 'Works on any device', 'Secure by default'].map((item) => (
                  <li className="inline-flex items-center gap-1.5" key={item}>
                    <Check aria-hidden="true" className="text-[#b8d28e]" size={13} strokeWidth={2.6} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div aria-hidden="true" className="absolute -inset-6 rounded-[34px] bg-[#b8d28e]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-white/[0.07] p-2.5 shadow-[0_30px_80px_rgba(4,18,12,0.45)] backdrop-blur-xl">
                <div className="rounded-[20px] border border-white/10 bg-[#0c2a1e]/85 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#d68c54]/80" />
                      <span className="size-2 rounded-full bg-[#d8c77a]/80" />
                      <span className="size-2 rounded-full bg-[#b8d28e]/80" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[1.3px] text-white/40">Farm overview</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b8d28e]/25 bg-[#b8d28e]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#c8e0a1]">
                      <span className="size-1.5 rounded-full bg-[#b8d28e]" />
                      Live
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {[
                      { label: 'Eggs today', value: '1,248' },
                      { label: 'Feed stock', value: '82%' },
                      { label: 'Healthy flocks', value: '12' },
                    ].map((stat) => (
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5" key={stat.label}>
                        <p className="text-[9.5px] font-semibold uppercase tracking-[0.9px] text-white/40">{stat.label}</p>
                        <p className="mt-1 font-display text-[19px] font-semibold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10.5px] font-semibold text-white/60">Weekly egg production</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#b8d28e]">
                        +6.4%
                        <ArrowRight aria-hidden="true" className="-rotate-45" size={11} />
                      </span>
                    </div>
                    <div className="mt-3 flex h-24 items-end gap-2">
                      {CHART.map((height, index) => (
                        <div className="flex-1 rounded-t-md bg-[linear-gradient(180deg,#b8d28e,#5f8f55)] opacity-80" key={index} style={{ height: `${height}%` }} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {[
                      { dot: 'bg-[#b8d28e]', text: 'Layer flock A · 1,120 eggs collected' },
                      { dot: 'bg-[#d8c77a]', text: 'Feed restock due · Layer mash (2 days)' },
                    ].map((row) => (
                      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2" key={row.text}>
                        <span className={`size-1.5 shrink-0 rounded-full ${row.dot}`} />
                        <span className="truncate text-[11px] text-white/60">{row.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] scroll-mt-24 py-10 max-sm:w-[calc(100%-36px)]" id="features">
          <div className="max-w-[640px]">
            <p className={eyebrowClass}>What’s inside</p>
            <h2 className="mt-3 font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.12] tracking-[-1.2px] text-white">
              Everything your poultry farm needs. Nothing it doesn’t.
            </h2>
            <p className="mt-3 text-[13.5px] leading-[1.75] text-white/60">
              Six connected modules cover the daily work of a poultry farm — from the
              first chick to the last egg of the day.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description, points }) => (
              <article
                className="group rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-[#b8d28e]/35 hover:bg-white/[0.08] hover:shadow-[0_18px_40px_rgba(4,18,12,0.35)]"
                key={title}
              >
                <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#b8d28e]/10 text-[#c6dfa0] transition group-hover:bg-[#b8d28e]/20 group-hover:text-[#e2f3c7]">
                  <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-[1.7] text-white/60">{description}</p>
                <ul className="mt-3.5 space-y-1.5">
                  {points.map((point) => (
                    <li className="flex items-start gap-2 text-[11.5px] text-white/50" key={point}>
                      <Check aria-hidden="true" className="mt-[1px] shrink-0 text-[#b8d28e]" size={12} strokeWidth={2.6} />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] py-10 max-sm:w-[calc(100%-36px)]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className={eyebrowClass}>How it works</p>
                <h2 className="mt-3 font-display text-[clamp(24px,2.8vw,32px)] font-semibold leading-[1.15] tracking-[-0.9px] text-white">
                  Set up once, then track every day.
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-semibold text-white/55">
                <Sprout aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Three simple steps
              </span>
            </div>

            <ol className="mt-7 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5" key={step.title}>
                  <span className="grid size-9 place-items-center rounded-full bg-[#b8d28e]/15 font-display text-[14px] font-bold text-[#c8e0a1]">
                    {index + 1}
                  </span>
                  <h3 className="mt-3.5 text-[13.5px] font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-[1.7] text-white/55">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] scroll-mt-24 py-12 max-sm:w-[calc(100%-36px)]" id="about">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div>
              <p className={eyebrowClass}>About MkulimaFlow</p>
              <h2 className="mt-3 font-display text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.12] tracking-[-1.2px] text-white">
                A poultry management system made for real farms.
              </h2>
              <p className="mt-4 text-[13.5px] leading-[1.8] text-white/65">
                MkulimaFlow was built to replace scattered notebooks, chat messages, and
                spreadsheets with one clear workspace. It is designed for the way poultry
                farms actually work — quick entries in the morning, decisions during the
                day, and records you can trust at the end of the month.
              </p>
              <p className="mt-3 text-[13.5px] leading-[1.8] text-white/65">
                Whether you keep layers, broilers, or a mixed flock, the platform keeps
                production, feed, and health information connected so nothing gets lost
                between the coop and the office.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] no-underline transition hover:-translate-y-0.5 hover:bg-[#c9e0a3]"
                  to="/signup"
                >
                  Get started free
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
                <Link
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-[12.5px] font-semibold text-white/85 no-underline backdrop-blur-md transition hover:border-white/35 hover:bg-white/[0.11] hover:text-white"
                  to="/login"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-6 backdrop-blur-md sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40">Why farms choose it</p>
              <ul className="mt-4 space-y-3">
                {REASONS.map((reason) => (
                  <li className="flex items-start gap-2.5 text-[12.5px] leading-[1.6] text-white/75" key={reason}>
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#b8d28e]/15 text-[#c8e0a1]">
                      <Check aria-hidden="true" size={11} strokeWidth={3} />
                    </span>
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[10.5px] text-white/45">
                <ShieldCheck aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Your farm records stay private to your account.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] pb-16 max-sm:w-[calc(100%-36px)]">
          <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[linear-gradient(120deg,rgba(30,86,52,0.85),rgba(11,32,23,0.92))] p-7 shadow-[0_24px_60px_rgba(4,18,12,0.35)] backdrop-blur-xl sm:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#b8d28e]/15 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold leading-[1.15] tracking-[-1px] text-white">
                  Ready to run a better poultry farm?
                </h2>
                <p className="mt-2 max-w-[520px] text-[13px] leading-[1.7] text-white/65">
                  Create a free farmer account and bring your flocks, eggs, feed, and
                  health records into one calm workspace.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] no-underline transition hover:-translate-y-0.5 hover:bg-[#c9e0a3]"
                  to="/signup"
                >
                  Create free account
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
                <Link
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-[12.5px] font-semibold text-white/85 no-underline transition hover:border-white/35 hover:bg-white/[0.11] hover:text-white"
                  to="/login"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
