import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import getInitials from '../../utils/initials'
import Brand from './Brand'

export default function Header() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    setError('')

    try {
      await signOut()
      navigate('/login')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(105deg,rgba(12,37,26,0.95),rgba(24,74,43,0.75)),url('/images/dashboardbackground.png')] bg-cover bg-center text-white shadow-[0_10px_30px_rgba(9,28,19,0.2)] backdrop-blur-md">
      <div className="mx-auto flex min-h-[77px] w-[min(1200px,calc(100%-64px))] items-center justify-between gap-3 max-sm:w-[calc(100%-36px)]">
        <Brand light compact to="/about" />
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Primary">
          <NavLink
            className={({ isActive }) => `rounded-full px-2.5 py-1.5 text-[13px] font-semibold no-underline transition hover:bg-white/10 hover:text-white ${isActive ? 'bg-white/10 text-white' : 'text-white/80'}`}
            to="/about"
          >
            About
          </NavLink>
          {user ? (
            <>
              <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-2 pr-3.5 text-[12px] font-semibold text-white/85 backdrop-blur-md sm:inline-flex">
                <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,#b8d28e,#6e9a5b)] text-[10px] font-bold text-[#173325] ring-2 ring-white/20">
                  {getInitials(user.username, '')}
                </span>
                <span className="max-w-[120px] truncate">{user.username}</span>
              </span>
              <button
                className="inline-flex min-h-[39px] items-center rounded-full border border-white/20 bg-white/10 px-4 text-[12px] font-semibold text-white backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#b8d28e]/50 disabled:cursor-wait disabled:opacity-60 max-sm:min-h-[37px] max-sm:px-3 max-sm:text-[11px]"
                disabled={busy}
                onClick={handleSignOut}
                type="button"
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <Link className="rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-white/80 no-underline transition hover:bg-white/10 hover:text-white max-[420px]:hidden" to="/login">
                Log in
              </Link>
              <Link
                className="inline-flex min-h-[39px] items-center rounded-full bg-[#b8d28e] px-4 text-[12px] font-bold text-[#173325] no-underline shadow-[0_7px_16px_rgba(9,28,19,0.25)] transition hover:-translate-y-px hover:bg-[#c9e0a3] max-sm:min-h-[37px] max-sm:px-3 max-sm:text-[11px]"
                to="/signup"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
      {error && (
        <div className="absolute right-4 top-full mt-2 rounded-xl border border-white/15 bg-[#2a1c12]/95 px-3.5 py-2.5 text-[13px] text-[#f3c7a9] shadow-[0_12px_30px_rgba(9,28,19,0.35)] backdrop-blur-md sm:right-8" role="alert">
          {error}
        </div>
      )}
    </header>
  )
}
