import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Bird,
  Boxes,
  ClipboardList,
  Egg,
  LayoutDashboard,
  ShieldCheck,
  Sprout,
} from 'lucide-react'
import Brand from './Brand'

const CURRENT_YEAR = new Date().getFullYear()

const FARM_MODULES = [
  { label: 'Farm overview', hint: 'Daily farm summary', to: '/', icon: LayoutDashboard },
  { label: 'Poultry management', hint: 'Flocks, breeds & housing', to: '/flocks', icon: Bird },
  { label: 'Egg production', hint: 'Collections & trends', to: '/egg-production', icon: Egg },
  { label: 'Feed inventory', hint: 'Stock, usage & suppliers', to: '/feed', icon: Boxes },
  { label: 'Healthcare', hint: 'Treatments & vaccinations', to: '/healthcare', icon: ShieldCheck },
  { label: 'Health reports', hint: 'Mortality & insights', to: '/healthcare/reports', icon: ClipboardList },
]

const FOOTER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Log in', to: '/login' },
  { label: 'Create account', to: '/signup' },
]

const linkClass =
  'text-white/60 no-underline underline-offset-4 transition hover:text-white hover:underline hover:decoration-[#b8d28e]/60'

const tileClass =
  'group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:border-[#b8d28e]/35 hover:bg-white/[0.09] hover:shadow-[0_12px_30px_rgba(4,18,12,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8d28e]/60'

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,rgba(7,24,17,0.45),rgba(7,24,17,0.88))] text-white backdrop-blur-xl">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-[#b8d28e]/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-0 size-80 rounded-full bg-[#2f7a4e]/20 blur-3xl" />

      <div className="relative mx-auto w-[min(1200px,calc(100%-64px))] py-10 max-sm:w-[calc(100%-36px)] max-sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
          <div className="flex flex-col items-start">
            <Brand light />
            <p className="mt-4 max-w-[330px] text-[12.5px] leading-[1.75] text-white/60">
              A simpler way for farmers and buyers to find each other, track production,
              and move agriculture forward.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-semibold text-white/65 backdrop-blur-md">
                <Sprout aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Rooted in community
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-semibold text-white/65 backdrop-blur-md">
                <ShieldCheck aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Secure sign-in
              </span>
            </div>
          </div>

          <nav aria-label="Farm modules">
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40">Farm modules</p>
              <Link className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c8e0a1] no-underline transition hover:text-[#e3f2c8]" to="/login">
                Open workspace
                <ArrowUpRight aria-hidden="true" size={12} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {FARM_MODULES.map(({ label, hint, to, icon: Icon }) => (
                <Link className={tileClass} key={to} to={to}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#b8d28e]/10 text-[#c6dfa0] transition group-hover:bg-[#b8d28e]/20 group-hover:text-[#e2f3c7]">
                    <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-semibold text-white/85 transition group-hover:text-white">{label}</span>
                    <span className="mt-0.5 block truncate text-[10.5px] text-white/45">{hint}</span>
                  </span>
                  <ArrowUpRight aria-hidden="true" className="ml-auto shrink-0 text-white/25 transition group-hover:text-[#b8d28e]" size={13} />
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-white/45">© {CURRENT_YEAR} MkulimaFlow. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
            {FOOTER_LINKS.map((link) => (
              <Link className={linkClass} key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            <a className={linkClass} href="mailto:support@mkulimaflow.com">Email support</a>
            <span className="hidden items-center gap-2 text-white/40 md:inline-flex">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#b8d28e]" />
              Growing better, together.
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
