import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  Egg,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import useAuth from '../hooks/useAuth'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, active: true },
  { label: 'Flock', icon: Activity },
  { label: 'Egg production', icon: Egg },
  { label: 'Feed inventory', icon: Package },
  { label: 'Health & care', icon: ShieldCheck },
]

function Sidebar({ open, onClose }) {
  return (
    <>
      
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#223d2f] text-white transition-transform duration-200 lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[77px] items-center justify-between border-b border-grey/10 px-6">
          <Link aria-label="MkulimaFlow home" className="flex items-center gap-2.5 no-underline" to="/">
            <img alt="" className="h-10 w-10 rounded-xl object-cover" src="/images/mkulimaflow-logo.png" />
            <span className="font-display text-[16px] font-bold tracking-[-0.4px] text-white">
              Mkulima<span className="text-[#b8d28e]">Flow</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg text-white/65 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <nav aria-label="Farm management" className="flex-1 px-4 py-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.4px] text-white/40">Farm management</p>
          <ul className="space-y-1">
            {navigation.map(({ label, icon: Icon, active }) => (
              <li key={label}>
                {active ? (
                  <NavLink
                    className="flex min-h-11 items-center gap-3 rounded-xl bg-[#b8d28e]/15 px-3 text-[13px] font-semibold text-[#d3e6b2] no-underline"
                    end
                    onClick={onClose}
                    to="/"
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                    {label}
                    <span className="ml-auto size-1.5 rounded-full bg-[#b8d28e]" />
                  </NavLink>
                ) : (
                  <button
                    aria-disabled="true"
                    className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium text-white/65"
                    disabled
                    title={`${label} — coming soon`}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                    {label}
                    <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-white/35">Soon</span>
                  </button>
                )}
              </li>
            ))}
          </ul>

          <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[1.4px] text-white/40">Workspace</p>
          <button
            aria-disabled="true"
            className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium text-white/65"
            disabled
            title="Settings — coming soon"
            type="button"
          >
            <Settings aria-hidden="true" size={18} strokeWidth={1.8} />
            Settings
          </button>
        </nav>

        
      </aside>
    </>
  )
}

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [farm, setFarm] = useState('Main farm')
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await signOut()
    } catch (error) {
      setSignOutError(error.message)
    } finally {
      setSigningOut(false)
    }
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'MF'

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#27352c] lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(rgba(24,74,43,0.9),rgba(24,74,43,0.9)),url('/images/dashboardbackground.png')] bg-cover bg-center text-white">
          <div className="flex min-h-[77px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e8ebe4] text-[#526258] hover:bg-[#f5f7f2] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                type="button"
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <span className="hidden text-[10px] font-semibold uppercase tracking-[1.2px] text-white/65 sm:block">Your workspace</span>
                <label className="relative mt-0.5 flex max-w-[240px] items-center gap-2 text-sm font-bold text-white">
                  <span className="sr-only">Select farm</span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/15 text-[#d7e9bc]">
                    <Activity aria-hidden="true" size={15} />
                  </span>
                  <select
                    aria-label="Farm context"
                    className="min-w-0 cursor-pointer appearance-none bg-transparent pr-5 text-ellipsis outline-none"
                    onChange={(event) => setFarm(event.target.value)}
                    value={farm}
                  >
                    <option value="Main farm">Main farm</option>
                    <option value="North farm">North farm</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-0 text-white/65" size={15} />
                </label>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <span className="hidden text-[12px] text-white/70 md:block">Farm workspace</span>
              <button
                aria-label="Notifications"
                className="relative grid size-10 place-items-center rounded-xl text-white/85 transition hover:bg-white/10 hover:text-white"
                type="button"
              >
                <Bell aria-hidden="true" size={19} strokeWidth={1.8} />
                <span className="absolute right-[9px] top-[8px] size-2 rounded-full border-2 border-white bg-[#d68c54]" />
              </button>
              <div className="hidden h-8 w-px bg-white/20 sm:block" />
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                  {initials}
                </span>
                <div className="hidden max-w-[135px] sm:block">
                  <p className="truncate text-[12px] font-semibold text-white">{user?.username}</p>
                  <button
                    className="text-[10px] text-white/70 transition hover:text-white disabled:opacity-60"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    type="button"
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
                <button
                  aria-label={signingOut ? 'Signing out' : 'Sign out'}
                  className="grid size-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white sm:hidden"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  type="button"
                >
                  <LogOut aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
          </div>
          {signOutError && (
            <p className="border-t border-[#f1d7cb] bg-[#fff7f2] px-5 py-2 text-xs text-[#94451f]" role="alert">
              Could not sign out: {signOutError}
            </p>
          )}
        </header>
        <main className="min-h-[calc(100vh-77px)] bg-[linear-gradient(rgba(247,248,245,0.01),rgba(247,248,245,0.86)),url('/images/overviewbackground.png.jpg')] bg-cover bg-center bg-fixed">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
            <Outlet context={{ farm }} />
          </div>
        </main>
      </div>
    </div>
  )
}
