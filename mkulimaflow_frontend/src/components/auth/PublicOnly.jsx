import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import LoadingPage from '../../pages/LoadingPage'

export default function PublicOnly({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingPage />
  return user ? <Navigate replace to="/" /> : children
}
