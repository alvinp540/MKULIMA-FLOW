import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  Bell,
  ChevronDown,
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
import getInitials from '../utils/initials'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, path: '/' },
  { label: 'Flock', icon: Activity, path: '/flocks' },
  { label: 'Egg production', icon: Egg, path: '/egg-production' },
  { label: 'Feed inventory', icon: Package, path: '/feed' },
  { label: 'Health & care', icon: ShieldCheck, path: '/healthcare' },
]

function Sidebar({ open, onClose }) {
  const { pathname } = useLocation()

  return (
    <>
      <button
        aria-hidden={!open}
        aria-label="Close navigation"
        className={`fixed inset-0 z-30 bg-[#08160f]/60 backdrop-blur-xs transition-opacity duration-200 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        type="button"
      />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[linear-gradient(rgba(24,74,43,0.9),rgba(24,74,43,0.9)),url('/images/dashboardbackground.png')] bg-cover bg-center text-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[77px] items-center justify-between border-b border-white/10 px-6">
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

        <nav aria-label="Farm management" className="flex-1 overflow-y-auto px-4 py-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[1.4px] text-white/40">Farm management</p>
          <ul className="space-y-1">
            {navigation.map(({ label, icon: Icon, path }) => (
              <li key={path}>
                <NavLink
                  className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold no-underline transition ${isActive ? 'bg-[#b8d28e]/15 text-[#d3e6b2]' : 'text-white/75 hover:bg-white/5 hover:text-white'}`}
                  end={path === '/'}
                  onClick={onClose}
                  to={path}
                >
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  {label}
                  {pathname === path ? <span className="ml-auto size-1.5 rounded-full bg-[#b8d28e]" /> : null}
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[1.4px] text-white/40">Workspace</p>
          <NavLink
            className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold no-underline ${isActive ? 'bg-[#b8d28e]/15 text-[#d3e6b2]' : 'text-white/75 hover:bg-white/5 hover:text-white'}`}
            onClick={onClose}
            to="/settings"
          >
            <Settings aria-hidden="true" size={18} strokeWidth={1.8} />
            Settings
          </NavLink>
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

  const initials = getInitials(user?.username)

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#27352c] lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1 bg-[linear-gradient(rgba(11,26,19,0.35),rgba(11,26,19,0.35)),url('/images/overviewbackground.png.jpg')] bg-cover bg-center bg-fixed">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(105deg,rgba(12,37,26,0.95),rgba(24,74,43,0.75)),url('/images/dashboardbackground.png')] bg-cover bg-center text-white shadow-[0_10px_30px_rgba(9,28,19,0.2)] backdrop-blur-md">
          <div className="flex min-h-[77px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setSidebarOpen(true)}
                type="button"
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <span className="hidden text-[10px] font-semibold uppercase tracking-[1.4px] text-white/55 sm:block">Your workspace</span>
                <label className="mt-1 flex max-w-[260px] cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pl-2 pr-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition hover:bg-white/15">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#b8d28e]/20 text-[#d7e9bc]">
                    <Activity aria-hidden="true" size={15} />
                  </span>
                  <select
                    aria-label="Farm context"
                    className="min-w-0 cursor-pointer appearance-none bg-transparent pr-4 text-ellipsis outline-none"
                    onChange={(event) => setFarm(event.target.value)}
                    value={farm}
                  >
                    <option className="text-[#1f3028]" value="Main farm">Main farm</option>
                    <option className="text-[#1f3028]" value="North farm">North farm</option>
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none -ml-1 shrink-0 text-white/60" size={15} />
                </label>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-md md:inline-flex">
                <span className="size-1.5 rounded-full bg-[#b8d28e] shadow-[0_0_0_3px_rgba(184,210,142,0.15)]" />
                Farm workspace
              </span>
              <button
                aria-label="Notifications"
                className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/85 transition hover:bg-white/10 hover:text-white"
                type="button"
              >
                <Bell aria-hidden="true" size={18} strokeWidth={1.8} />
                <span className="absolute right-[9px] top-[9px] size-2 rounded-full border-2 border-[#1b4a31] bg-[#d68c54]" />
              </button>
              <div className="hidden h-8 w-px bg-white/15 sm:block" />
              <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2 backdrop-blur-md">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,#b8d28e,#6e9a5b)] text-[11px] font-bold text-[#173325] ring-2 ring-white/20">
                  {initials}
                </span>
                <div className="hidden max-w-[135px] leading-tight sm:block">
                  <p className="truncate text-[12px] font-semibold text-white">{user?.username}</p>
                  <button
                    className="text-[10px] text-white/60 transition hover:text-white disabled:opacity-60"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    type="button"
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
                <button
                  aria-label={signingOut ? 'Signing out' : 'Sign out'}
                  className="grid size-8 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-60 sm:hidden"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  type="button"
                >
                  <LogOut aria-hidden="true" size={15} />
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
