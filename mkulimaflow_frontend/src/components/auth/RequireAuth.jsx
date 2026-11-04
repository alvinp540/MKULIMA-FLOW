import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import LoadingPage from '../../pages/LoadingPage'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingPage />
  return user ? children : <Navigate replace to="/login" />
}
