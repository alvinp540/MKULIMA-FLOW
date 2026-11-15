import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/common/Header'
import RequireAuth from './components/auth/RequireAuth'
import PublicOnly from './components/auth/PublicOnly'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import HomePage from './pages/dashboard/HomePage'
import FlocksPage from './pages/dashboard/FlocksPage'
import EggProductionPage from './pages/dashboard/EggProductionPage'
import FeedInventoryPage from './pages/dashboard/FeedInventoryPage'
import HealthcarePage from './pages/dashboard/HealthcarePage'
import HealthReportsPage from './pages/dashboard/HealthReportsPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import DashboardLayout from './layouts/DashboardLayout'

const CURRENT_YEAR = new Date().getFullYear()

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(rgba(16,35,27,0.55),rgba(16,35,27,0.55)),url('/images/dashboardbackground.png')] bg-cover bg-center bg-fixed">
      <Header />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <footer className="mx-auto flex min-h-[46px] w-[min(1200px,calc(100%-64px))] items-center justify-between border-t border-white/15 text-[10px] text-white/50 max-sm:w-[calc(100%-36px)]">
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
          <Route path="flocks" element={<FlocksPage />} />
          <Route path="egg-production" element={<EggProductionPage />} />
          <Route path="feed" element={<FeedInventoryPage />} />
          <Route path="healthcare" element={<HealthcarePage />} />
          <Route path="healthcare/reports" element={<HealthReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </AuthProvider>
  )
}
