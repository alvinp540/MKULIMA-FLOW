import { useEffect, useState } from 'react'
import {
  Bell,
  Building2,
  Check,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { csrfFetch } from '../../services/authService'

const initialProfile = {
  fullName: 'Akinyi Muthoni',
  email: 'akinyi@mkulimaflow.com',
  phone: '+254 712 345 678',
  timezone: 'East Africa Time (UTC+3)',
}

const initialFarm = {
  farmName: 'Main Farm',
  location: 'Nakuru County',
  productionFocus: 'Broilers & Layers',
  currency: 'KES',
  dayStart: '06:00',
}

const initialPreferences = {
  autoAlerts: true,
  weeklyDigest: true,
  lowStockAlert: true,
  mortalityAlert: true,
  emailReports: false,
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(initialProfile)
  const [farm, setFarm] = useState(initialFarm)
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await csrfFetch('/api/settings/')
        const settings = data.settings ?? data

        setProfile({
          fullName: settings.full_name || initialProfile.fullName,
          email: settings.email || initialProfile.email,
          phone: settings.phone || initialProfile.phone,
          timezone: settings.timezone || initialProfile.timezone,
        })

        setFarm({
          farmName: settings.farm_name || initialFarm.farmName,
          location: settings.farm_location || initialFarm.location,
          productionFocus: settings.production_focus || initialFarm.productionFocus,
          currency: settings.currency || initialFarm.currency,
          dayStart: settings.day_start ? settings.day_start.slice(0, 5) : initialFarm.dayStart,
        })

        setPreferences({
          autoAlerts: settings.auto_alerts ?? initialPreferences.autoAlerts,
          weeklyDigest: settings.weekly_digest ?? initialPreferences.weeklyDigest,
          lowStockAlert: settings.low_stock_alert ?? initialPreferences.lowStockAlert,
          mortalityAlert: settings.mortality_alert ?? initialPreferences.mortalityAlert,
          emailReports: settings.email_reports ?? initialPreferences.emailReports,
        })
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  function handleProfileChange(field, value) {
    setProfile((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function handleFarmChange(field, value) {
    setFarm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  function handlePreferenceChange(field) {
    setPreferences((current) => ({ ...current, [field]: !current[field] }))
    setSaved(false)
  }

  async function handleSave() {
    try {
      await csrfFetch('/api/settings/', {
        method: 'PUT',
        body: {
          full_name: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          timezone: profile.timezone,
          farm_name: farm.farmName,
          farm_location: farm.location,
          production_focus: farm.productionFocus,
          currency: farm.currency,
          day_start: farm.dayStart,
          auto_alerts: preferences.autoAlerts,
          weekly_digest: preferences.weeklyDigest,
          low_stock_alert: preferences.lowStockAlert,
          mortality_alert: preferences.mortalityAlert,
          email_reports: preferences.emailReports,
        },
      })
      setSaved(true)
      setStatusMessage('Settings updated successfully.')
    } catch (error) {
      setSaved(false)
      setStatusMessage(error.message)
      console.error(error)
    }
  }

  function handleResetSettings() {
    setProfile(initialProfile)
    setFarm(initialFarm)
    setPreferences(initialPreferences)
    setSaved(false)
    setStatusMessage('Settings reset to default values.')
  }

  function handleDeleteSavedSettings() {
    const confirmed = window.confirm('Delete saved settings values and restore the default farm configuration?')
    if (!confirmed) return

    setProfile(initialProfile)
    setFarm(initialFarm)
    setPreferences(initialPreferences)
    setSaved(false)
    setStatusMessage('Saved settings were cleared and restored to defaults.')
  }

  async function handlePasswordChange(event) {
    event.preventDefault()
    setPasswordMessage('')
    setPasswordError('')

    try {
      const response = await csrfFetch('/api/auth/change-password/', {
        method: 'POST',
        body: {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          confirm_password: passwordForm.confirmPassword,
        },
      })

      setPasswordMessage(response.message || 'Password updated successfully.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setPasswordError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 text-sm text-[#58665f] shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
        Loading settings…
      </div>
    )
  }

  return (
    <div className="space-y-7 pb-4">
      <section className="rounded-[28px] border border-[#dfe7df] bg-[linear-gradient(120deg,rgba(13,43,31,0.96),rgba(28,93,68,0.9)),url('/images/dashboardbackground.png')] bg-cover bg-center px-6 py-6 text-white shadow-[0_26px_70px_rgba(16,35,27,0.18)] sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d4ebbf]">Workspace</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">Settings</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2]">
            <ShieldCheck className="size-3.5" />
            Farm account ready
          </div>
        </div>
      </section>

      {saved ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#dfe7df] bg-[#f3faf4] px-4 py-3 text-sm font-medium text-[#2b6c4b]">
          <Check className="size-4" />
          Settings saved successfully.
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-2xl border border-[#dfe7df] bg-white/90 px-4 py-3 text-sm text-[#2a3b35] shadow-[0_10px_24px_rgba(18,32,25,0.03)]">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-7">
          <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/25 shadow-sm shadow-emerald-500/15">
                <UserRound className="size-5" strokeWidth={2.2} />
              </span>
              <h2 className="text-lg font-semibold text-[#1d332a]">Profile</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-[#415348]">
                Full name
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={profile.fullName}
                  onChange={(event) => handleProfileChange('fullName', event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-[#415348]">
                Email address
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  type="email"
                  value={profile.email}
                  onChange={(event) => handleProfileChange('email', event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-[#415348]">
                Phone number
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={profile.phone}
                  onChange={(event) => handleProfileChange('phone', event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-[#415348]">
                Timezone
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={profile.timezone}
                  onChange={(event) => handleProfileChange('timezone', event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eef7ff] text-[#1d6db5]">
                <Building2 className="size-5" />
              </span>
              <h2 className="text-lg font-semibold text-[#1d332a]">Farm preferences</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-[#415348]">
                Farm name
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={farm.farmName}
                  onChange={(event) => handleFarmChange('farmName', event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-[#415348]">
                Location
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={farm.location}
                  onChange={(event) => handleFarmChange('location', event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-[#415348]">
                Production focus
                <input
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={farm.productionFocus}
                  onChange={(event) => handleFarmChange('productionFocus', event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-[#415348]">
                Currency
                <select
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={farm.currency}
                  onChange={(event) => handleFarmChange('currency', event.target.value)}
                >
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="TZS">TZS</option>
                  <option value="UGX">UGX</option>
                </select>
              </label>

              <label className="text-sm font-medium text-[#415348] md:col-span-2">
                Day start time
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                  value={farm.dayStart}
                  onChange={(event) => handleFarmChange('dayStart', event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <aside className="space-y-7">
          <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#fff1d7] text-[#b97917]">
                <Bell className="size-5" />
              </span>
              <h2 className="text-lg font-semibold text-[#1d332a]">Notifications</h2>
            </div>

            <div className="space-y-3">
              {[
                ['autoAlerts', 'Automatic alerts'],
                ['weeklyDigest', 'Weekly digest'],
                ['lowStockAlert', 'Low stock alerts'],
                ['mortalityAlert', 'Mortality alerts'],
                ['emailReports', 'Email reports'],
              ].map(([field, label]) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => handlePreferenceChange(field)}
                  className="flex w-full items-center justify-between rounded-2xl border border-[#edf1eb] bg-[#fafcf8] px-3.5 py-3 text-left"
                >
                  <span className="text-sm font-medium text-[#415348]">{label}</span>
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${preferences[field] ? 'bg-[#2a7b3c]' : 'bg-[#dfe7df]'}`}
                    aria-label={label}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition ${preferences[field] ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#f0f7ff] text-[#1d6db5]">
                <Lock className="size-5" />
              </span>
              <h2 className="text-lg font-semibold text-[#1d332a]">Security</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3 text-sm text-[#4b5852]">
              <div className="rounded-2xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                <p className="font-semibold text-[#1d332a]">Change password</p>
                <div className="mt-3 space-y-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    className="w-full rounded-xl border border-[#dfe7df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    className="w-full rounded-xl border border-[#dfe7df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-[#dfe7df] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                  />
                </div>
              </div>

              {passwordError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{passwordError}</div>
              ) : null}

              {passwordMessage ? (
                <div className="rounded-xl border border-[#dfe7df] bg-[#f3faf4] px-3 py-2 text-xs text-[#2b6c4b]">{passwordMessage}</div>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#dfe7df] bg-[#f8faf7] px-3 py-2.5 text-sm font-semibold text-[#1d332a] transition hover:bg-[#f1f6ef]"
              >
                Update password
              </button>
            </form>
          </div>

          <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#ecf9ef] text-[#2a7b3c]">
                <SlidersHorizontal className="size-5" />
              </span>
              <h2 className="text-lg font-semibold text-[#1d332a]">Quick actions</h2>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#1f4d34] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#173d2a]"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={handleResetSettings}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#dfe7df] bg-[#f8faf7] px-4 py-3 text-sm font-semibold text-[#1d332a] transition hover:bg-[#f1f6ef]"
              >
                Reset settings
              </button>
              <button
                type="button"
                onClick={handleDeleteSavedSettings}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#f2d5d9] bg-[#fff7f8] px-4 py-3 text-sm font-semibold text-[#8e3348] transition hover:bg-[#fff0f3]"
              >
                Delete saved settings
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
