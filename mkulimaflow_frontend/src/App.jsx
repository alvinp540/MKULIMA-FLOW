import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/common/Header'
import PublicOnly from './components/auth/PublicOnly'
import useAuth from './hooks/useAuth'
import LoadingPage from './pages/LoadingPage'
import LandingPage from './pages/public/LandingPage'
import PricingPage from './pages/public/PricingPage'
import TestimonialsPage from './pages/public/TestimonialsPage'
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

function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(rgba(16,35,27,0.55),rgba(16,35,27,0.55)),url('/images/dashboardbackground.png')] bg-cover bg-center bg-fixed">
      <Header />
      <div className="flex flex-1 flex-col">
        {children ?? <Outlet />}
      </div>
    </div>
  )
}

function RootGate() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <LoadingPage />

  if (!user) {
    return pathname === '/' ? (
      <PublicLayout>
        <LandingPage />
      </PublicLayout>
    ) : (
      <Navigate replace to="/about" />
    )
  }

  return <DashboardLayout />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="about" element={<LandingPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        </Route>
        <Route path="/" element={<RootGate />}>
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
