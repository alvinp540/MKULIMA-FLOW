import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
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
    <header className="relative z-10 h-[78px] border-b border-[#e8e8de] bg-[#fbfaf6]/95">
      <div className="mx-auto flex h-full w-[min(1200px,calc(100%-64px))] items-center justify-between max-sm:w-[calc(100%-36px)]">
        <Brand compact />
        <nav className="flex items-center gap-6 max-sm:gap-3" aria-label="Account navigation">
          {user ? (
            <>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4b574a]">
                <span className="size-2 rounded-full bg-[#5da77b] shadow-[0_0_0_3px_rgba(93,167,123,0.13)]" />
                <span className="max-w-[110px] truncate">{user.username}</span>
              </span>
              <button
                className="min-h-[41px] rounded-[10px] border border-[#d7dfd5] px-[17px] text-[13px] font-bold text-[#28583c] transition hover:border-[#346d4b] hover:bg-[#f0f4ed] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#346d4b]/40 disabled:cursor-wait disabled:opacity-70 max-sm:min-h-[37px] max-sm:px-3 max-sm:text-[11px]"
                disabled={busy}
                onClick={handleSignOut}
                type="button"
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <>
              <Link className="text-sm font-semibold text-[#4b574a] no-underline transition hover:text-[#346d4b]" to="/login">
                Log in
              </Link>
              <Link
                className="inline-flex min-h-[41px] items-center rounded-[10px] bg-[#346d4b] px-[17px] text-[13px] font-bold text-white no-underline shadow-[0_7px_16px_rgba(34,88,59,0.13)] transition hover:-translate-y-px hover:bg-[#28583c] max-sm:min-h-[37px] max-sm:px-3 max-sm:text-[11px]"
                to="/signup"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
      {error && (
        <div className="absolute right-8 top-full rounded-lg border border-[#e8c1ad] bg-[#fff6f0] px-3.5 py-2.5 text-[13px] text-[#94451f]" role="alert">
          {error}
        </div>
      )}
    </header>
  )
}
