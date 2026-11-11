import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, Download, HeartPulse, ShieldAlert, Stethoscope, TrendingUp } from 'lucide-react'
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
    {
      label: 'Healthy flocks',
      value: report.healthy_flocks,
      helper: 'Across active flock records',
      icon: HeartPulse,
      tone: 'emerald',
    },
    {
      label: 'Open cases',
      value: report.open_cases,
      helper: 'Need follow-up attention',
      icon: ShieldAlert,
      tone: 'amber',
    },
    {
      label: 'Scheduled checks',
      value: report.scheduled_checks,
      helper: 'Pending health reviews',
      icon: Stethoscope,
      tone: 'sky',
    },
    {
      label: 'Mortality rate',
      value: `${dashboard.summary?.mortality_rate ?? 0}%`,
      helper: 'Based on reported deaths',
      icon: TrendingUp,
      tone: 'rose',
    },
  ], [dashboard, report])

  const counts = [
    { label: 'Healthy', value: report.status_distribution.healthy, color: '#2f8f5b' },
    { label: 'Watch', value: report.status_distribution.watch, color: '#caa33d' },
    { label: 'Sick', value: report.status_distribution.sick, color: '#d97a34' },
    { label: 'Critical', value: report.status_distribution.critical, color: '#b63c53' },
  ]

  const maxValue = Math.max(...counts.map((item) => item.value), 1)

  const healthScore = useMemo(() => {
    const total = counts.reduce((sum, item) => sum + item.value, 0) || 1
    const score = Math.round(((report.status_distribution.healthy ?? 0) / total) * 100)
    return Math.min(100, Math.max(0, score))
  }, [report])

  const focusAreas = useMemo(() => {
    const criticalFlocks = report.total_flocks ? Math.max(1, Math.round((report.open_cases / report.total_flocks) * 100)) : 0

    return [
      { label: 'Flock health balance', value: `${report.healthy_flocks}/${report.total_flocks || 0}`, tone: 'emerald' },
      { label: 'Risk exposure', value: `${criticalFlocks}%`, tone: 'amber' },
      { label: 'Vaccination follow-up', value: `${dashboard.summary?.vaccinations_due ?? 0} due`, tone: 'sky' },
    ]
  }, [dashboard, report])

  const trendBars = [
    { label: 'Health score', value: healthScore, color: '#2f8f5b' },
    { label: 'Watchlist', value: Math.min(100, Math.round(((report.status_distribution.watch ?? 0) / Math.max(report.total_flocks || 1, 1)) * 100)), color: '#caa33d' },
    { label: 'Treatment need', value: Math.min(100, Math.round(((report.open_cases ?? 0) / Math.max(report.total_flocks || 1, 1)) * 100)), color: '#d97a34' },
  ]

  return (
    <div className="space-y-7 pb-4">
      <section className="rounded-[28px] border border-[#dfe7df] bg-[linear-gradient(120deg,rgba(13,43,31,0.96),rgba(28,93,68,0.9)),url('/images/dashboardbackground.png')] bg-cover bg-center px-6 py-6 text-white shadow-[0_26px_70px_rgba(16,35,27,0.18)] sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d4ebbf]">Insights</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">Health reports</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2] transition hover:bg-white/10">
              <Download className="size-3.5" />
              Export
            </button>
            <Link to="/healthcare" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2] no-underline transition hover:bg-white/10">
              Back to health dashboard
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[#e5e9e0] bg-white p-5 text-sm text-[#58665f] shadow-[0_10px_24px_rgba(18,32,25,0.03)]">Loading health insights…</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, helper, icon: Icon, tone }) => (
              <div key={label} className="rounded-[22px] border border-[#e9ece5] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(18,32,25,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#7b857f]">{label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-[-0.8px] text-[#1f3229]">{value}</p>
                    <p className="mt-2 text-[11px] text-[#65736a]">{helper}</p>
                  </div>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tone === 'emerald' ? 'bg-[#ebf7e6] text-[#2a7b3c]' : tone === 'amber' ? 'bg-[#fff1d7] text-[#b97917]' : tone === 'sky' ? 'bg-[#eaf4ff] text-[#1d6db5]' : 'bg-[#ffe8ea] text-[#b33a4f]'}`}>
                    <Icon className="size-5" />
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#ebf7e6] text-[#2a7b3c]">
                    <BarChart3 className="size-5" />
                  </span>
                  <h2 className="text-lg font-semibold text-[#1d332a]">Health status distribution</h2>
                </div>
                <span className="rounded-full bg-[#f1f7ee] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.2px] text-[#517b60]">
                  {report.total_flocks} flocks tracked
                </span>
              </div>

              <div className="space-y-4">
                {counts.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[#edf1eb] bg-[#fbfcfa] p-3.5">
                    <div className="mb-2 flex items-center justify-between text-sm text-[#4c5850]">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm font-semibold text-[#1d332a]">{item.value}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#edf2ec]">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#fff1d7] text-[#b97917]">
                  <ShieldAlert className="size-5" />
                </span>
                <h2 className="text-lg font-semibold text-[#1d332a]">Operational snapshot</h2>
              </div>

              <div className="space-y-3">
                {focusAreas.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[#edf1eb] bg-[#fafcf8] px-3.5 py-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#73807a]">{item.label}</p>
                      <p className="mt-1 text-base font-semibold text-[#1d332a]">{item.value}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.2px] ${item.tone === 'emerald' ? 'bg-[#ebf7e6] text-[#2a7b3c]' : item.tone === 'amber' ? 'bg-[#fff1d7] text-[#b97917]' : 'bg-[#eaf4ff] text-[#1d6db5]'}`}>
                      {item.tone}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-[#dfe7df] bg-[#f7faf5] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[#6c7b72]">Priority actions</p>
                <ul className="mt-3 space-y-2 text-sm text-[#4f5f56]">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-[#2a7b3c]" />
                    <span>{dashboard.alerts?.[0]?.message ?? 'No critical alerts reported.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-[#b97917]" />
                    <span>{report.open_cases ? `Review ${report.open_cases} open case(s) within the next farm check.` : 'No active cases are currently open.'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eef7ff] text-[#1d6db5]">
                  <TrendingUp className="size-5" />
                </span>
                <h2 className="text-lg font-semibold text-[#1d332a]">Performance indicators</h2>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#6c7b72]">Quarterly view</span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {trendBars.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#edf1eb] bg-[#fafcf8] p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[1.2px] text-[#728078]">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#edf2ec]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="rounded-[24px] border border-[#dfe7df] bg-[linear-gradient(135deg,#f8faf5,#eef5eb)] px-5 py-4 shadow-[0_12px_28px_rgba(18,32,25,0.02)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#66766b]">Farm summary</p>
                <p className="mt-1 text-sm font-semibold text-[#1d332a]">MkulimaFlow health overview</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#526259]">
                <span className="rounded-full border border-[#dfe7df] bg-white px-2.5 py-1">{report.total_flocks} flocks</span>
                <span className="rounded-full border border-[#dfe7df] bg-white px-2.5 py-1">{report.total_cases} cases</span>
                <span className="rounded-full border border-[#dfe7df] bg-white px-2.5 py-1">{dashboard.summary?.vaccinations_due ?? 0} due</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}
