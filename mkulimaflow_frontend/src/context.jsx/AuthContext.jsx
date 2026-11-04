import { createContext, useEffect, useState } from 'react'
import { authRequest, resetCsrfToken } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authRequest('session')
      .then((data) => setUser(data.authenticated ? data.user : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function signIn(credentials) {
    const data = await authRequest('login', {
      method: 'POST',
      body: credentials,
    })

    resetCsrfToken()
    setUser(data.user)
  }

  async function signUp(details) {
    const data = await authRequest('signup', {
      method: 'POST',
      body: details,
    })

    resetCsrfToken()
    setUser(data.user)
  }

  async function signOut() {
    await authRequest('logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
