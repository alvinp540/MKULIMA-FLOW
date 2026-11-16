import { Link } from 'react-router-dom'
import Brand from './Brand'

const CURRENT_YEAR = new Date().getFullYear()

const FOOTER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Testimonials', to: '/testimonials' },
  { label: 'Log in', to: '/login' },
  { label: 'Create account', to: '/signup' },
]

const linkClass =
  'text-white/60 no-underline underline-offset-4 transition hover:text-white hover:underline hover:decoration-[#b8d28e]/60'

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-[linear-gradient(180deg,rgba(7,24,17,0.45),rgba(7,24,17,0.88))] text-white backdrop-blur-xl">
      <div className="mx-auto flex w-[min(1200px,calc(100%-64px))] flex-col gap-6 py-8 max-sm:w-[calc(100%-36px)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Brand light />
          <p className="max-w-[220px] text-[11.5px] leading-[1.6] text-white/50 max-sm:hidden">
            Poultry farm management, made simple.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px]">
          {FOOTER_LINKS.map((link) => (
            <Link className={linkClass} key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-[min(1200px,calc(100%-64px))] flex-col gap-2 py-4 text-[11px] text-white/40 max-sm:w-[calc(100%-36px)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {CURRENT_YEAR} MkulimaFlow. All rights reserved.</p>
          <a className={linkClass} href="mailto:support@mkulimaflow.com">
            support@mkulimaflow.com
          </a>
        </div>
      </div>
    </footer>
  )
}
