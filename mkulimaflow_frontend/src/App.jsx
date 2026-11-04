import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/common/Header'
import RequireAuth from './components/auth/RequireAuth'
import PublicOnly from './components/auth/PublicOnly'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import HomePage from './pages/dashboard/HomePage'
import DashboardLayout from './layouts/DashboardLayout'

const CURRENT_YEAR = new Date().getFullYear()

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <footer className="mx-auto flex min-h-[59px] w-[min(1200px,calc(100%-64px))] items-center justify-between border-t border-[#e8e8de] text-[10px] text-[#969b91] max-sm:w-[calc(100%-36px)]">
        <span>© {CURRENT_YEAR} MkulimaFlow</span>
        <span>Growing better, together.</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        </Route>
        <Route path="/" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </AuthProvider>
  )
}
