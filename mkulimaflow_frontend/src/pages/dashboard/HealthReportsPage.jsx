import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, HeartPulse, ShieldAlert, Stethoscope, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { csrfFetch } from '../../services/authService'

export default function HealthReportsPage() {
  const [dashboard, setDashboard] = useState({ summary: {}, alerts: [] })
  const [report, setReport] = useState({
    total_flocks: 0,
    healthy_flocks: 0,
    total_cases: 0,
    open_cases: 0,
    scheduled_checks: 0,
    status_distribution: {
      healthy: 0,
      watch: 0,
      sick: 0,
      critical: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadReport() {
    setLoading(true)
    setError('')

    try {
      const [dashboardResponse, reportResponse] = await Promise.all([
        csrfFetch('/api/health/dashboard/'),
        csrfFetch('/api/health/reports/'),
      ])
      setDashboard(dashboardResponse)
      setReport(reportResponse.report ?? report)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  const cards = useMemo(() => [
    { label: 'Healthy flocks', value: report.healthy_flocks, icon: HeartPulse, tone: 'emerald' },
    { label: 'Open cases', value: report.open_cases, icon: ShieldAlert, tone: 'amber' },
    { label: 'Scheduled checks', value: report.scheduled_checks, icon: Stethoscope, tone: 'sky' },
    { label: 'Mortality rate', value: `${dashboard.summary?.mortality_rate ?? 0}%`, icon: TrendingUp, tone: 'rose' },
  ], [dashboard, report])

  const counts = [
    { label: 'Healthy', value: report.status_distribution.healthy, color: '#2f8f5b' },
    { label: 'Watch', value: report.status_distribution.watch, color: '#caa33d' },
    { label: 'Sick', value: report.status_distribution.sick, color: '#d97a34' },
    { label: 'Critical', value: report.status_distribution.critical, color: '#b63c53' },
  ]

  const maxValue = Math.max(...counts.map((item) => item.value), 1)

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] border border-[#dfe7df] bg-[linear-gradient(120deg,rgba(14,48,37,0.96),rgba(34,102,70,0.9)),url('/images/dashboardbackground.png')] bg-cover bg-center px-6 py-6 text-white shadow-[0_22px_70px_rgba(16,35,27,0.18)] sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d4ebbf]">Insights</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">Health reports</h1>
          </div>
          <Link to="/healthcare" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2] no-underline">
            Back to health dashboard
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[#e5e9e0] bg-white p-5 text-sm text-[#58665f]">Loading health insights…</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-2xl border border-[#e9ece5] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#7b857f]">{label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-[-0.8px] text-[#1f3229]">{value}</p>
                  </div>
                  <span className={`grid size-11 place-items-center rounded-2xl ${tone === 'emerald' ? 'bg-[#ebf7e6] text-[#2a7b3c]' : tone === 'amber' ? 'bg-[#fff1d7] text-[#b97917]' : tone === 'sky' ? 'bg-[#eaf4ff] text-[#1d6db5]' : 'bg-[#ffe8ea] text-[#b33a4f]'}`}>
                    <Icon className="size-5" />
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
              <div className="mb-4 flex items-center gap-3">
                <BarChart3 className="size-5 text-[#2a7b3c]" />
                <h2 className="text-lg font-semibold text-[#1d332a]">Health status distribution</h2>
              </div>

              <div className="space-y-4">
                {counts.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm text-[#4c5850]">
                      <span>{item.label}</span>
                      <span className="font-semibold text-[#1d332a]">{item.value}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-[#edf2ec]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
              <div className="mb-4 flex items-center gap-3">
                <ShieldAlert className="size-5 text-[#b97917]" />
                <h2 className="text-lg font-semibold text-[#1d332a]">Operational snapshot</h2>
              </div>
              <ul className="space-y-3 text-sm text-[#4f5f56]">
                <li className="flex items-center justify-between rounded-xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                  <span>Total flocks</span>
                  <span className="font-semibold text-[#1d332a]">{report.total_flocks}</span>
                </li>
                <li className="flex items-center justify-between rounded-xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                  <span>Active disease cases</span>
                  <span className="font-semibold text-[#1d332a]">{report.total_cases}</span>
                </li>
                <li className="flex items-center justify-between rounded-xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                  <span>Open cases</span>
                  <span className="font-semibold text-[#1d332a]">{report.open_cases}</span>
                </li>
                <li className="flex items-center justify-between rounded-xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                  <span>Vaccinations due</span>
                  <span className="font-semibold text-[#1d332a]">{dashboard.summary?.vaccinations_due ?? 0}</span>
                </li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
