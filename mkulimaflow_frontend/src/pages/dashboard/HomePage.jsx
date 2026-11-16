import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Bird,
  CalendarDays,
  Egg,
  HeartPulse,
  ShieldCheck,
  Wheat,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import { csrfFetch } from '../../services/authService'

const iconStyles = {
  green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/25 shadow-sm shadow-emerald-500/15',
  amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/25 shadow-sm shadow-amber-500/15',
  blue: 'bg-sky-50 text-sky-600 ring-1 ring-sky-500/25 shadow-sm shadow-sky-500/15',
  rose: 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/25 shadow-sm shadow-rose-500/15',
}

const numberFormat = new Intl.NumberFormat('en')

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0)
}

function formatDecimal(value) {
  return Number(value || 0).toLocaleString('en', { maximumFractionDigits: 2 })
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function HomePage() {
  const { user } = useAuth()
  const { farm } = useOutletContext()
  const [date] = useState(() => new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()))
  const [weekDays] = useState(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - index))
    return {
      key: dateKey(day),
      label: new Intl.DateTimeFormat('en', { weekday: 'narrow' }).format(day),
      fullLabel: new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(day),
    }
  }))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const firstName = user?.username?.split(/[ ._-]/)[0] || 'there'

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [flockData, eggData, feedData, healthData] = await Promise.all([
          csrfFetch('/api/flocks/'),
          csrfFetch('/api/egg-production/'),
          csrfFetch('/api/feed/items/'),
          csrfFetch('/api/health/dashboard/'),
        ])

        if (cancelled) return

        setData({
          flocks: flockData.flocks ?? [],
          flockSummary: flockData.summary ?? {},
          eggRecords: eggData.records ?? [],
          eggSummary: eggData.summary ?? {},
          feedItems: feedData.items ?? [],
          health: healthData ?? { summary: {}, alerts: [] },
        })
      } catch (requestError) {
        if (!cancelled) setError(requestError.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const weeklyEggs = useMemo(() => {
    const totalsByDate = new Map()
    ;(data?.eggRecords ?? []).forEach((record) => {
      totalsByDate.set(
        record.collection_date,
        (totalsByDate.get(record.collection_date) ?? 0) + Number(record.eggs_collected || 0),
      )
    })

    return weekDays.map((day) => ({
      ...day,
      value: totalsByDate.get(day.key) ?? 0,
    }))
  }, [data, weekDays])

  const todayEggs = weeklyEggs[weeklyEggs.length - 1]?.value ?? 0
  const weekTotal = weeklyEggs.reduce((sum, day) => sum + day.value, 0)
  const weekAverage = Math.round(weekTotal / 7)
  const chartMax = Math.max(...weeklyEggs.map((day) => day.value), 0)

  const activeFlocks = useMemo(
    () => (data?.flocks ?? []).filter((flock) => flock.status === 'active'),
    [data],
  )
  const activeBirds = activeFlocks.reduce((sum, flock) => sum + Number(flock.initial_quantity || 0), 0)
  const totalBirds = Number(data?.health?.summary?.total_birds ?? 0)

  const feedOnHand = useMemo(() => {
    const items = data?.feedItems ?? []
    const totalsByUnit = new Map()

    items.forEach((item) => {
      const unit = item.unit || 'kg'
      totalsByUnit.set(unit, (totalsByUnit.get(unit) ?? 0) + Number(item.current_stock || 0))
    })

    if (totalsByUnit.size === 0) {
      return { value: '0 kg', detail: 'across your inventory' }
    }

    if (totalsByUnit.size === 1) {
      const [[unit, total]] = Array.from(totalsByUnit.entries())
      return { value: `${formatDecimal(total)} ${unit}`, detail: 'across your inventory' }
    }

    const total = Array.from(totalsByUnit.values()).reduce((sum, value) => sum + value, 0)
    return { value: formatDecimal(total), detail: `across ${items.length} feed items` }
  }, [data])

  const healthSummary = data?.health?.summary ?? {}
  const attentionCount = Number(healthSummary.active_disease_cases ?? 0) + Number(healthSummary.vaccinations_due ?? 0)

  const metrics = [
    {
      label: 'Active flock',
      value: loading ? '—' : formatNumber(activeBirds),
      detail: 'birds on this farm',
      icon: Bird,
      tone: 'green',
    },
    {
      label: 'Eggs collected',
      value: loading ? '—' : formatNumber(todayEggs),
      detail: 'collected today',
      icon: Egg,
      tone: 'amber',
    },
    {
      label: 'Feed on hand',
      value: loading ? '—' : feedOnHand.value,
      detail: feedOnHand.detail,
      icon: Wheat,
      tone: 'blue',
    },
    {
      label: 'Health checks',
      value: loading ? '—' : formatNumber(attentionCount),
      detail: attentionCount ? 'need attention' : 'all clear',
      icon: HeartPulse,
      tone: 'rose',
    },
  ]

  const healthItems = [
    { label: 'Healthy flocks', value: formatNumber(healthSummary.healthy_flocks ?? 0) },
    { label: 'Vaccinations due', value: formatNumber(healthSummary.vaccinations_due ?? 0) },
    { label: 'Disease cases', value: formatNumber(healthSummary.active_disease_cases ?? 0) },
    { label: 'Mortality rate', value: `${formatDecimal(healthSummary.mortality_rate ?? 0)}%` },
  ]

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
            <CalendarDays aria-hidden="true" size={15} className="text-emerald-600" />
            {date}
          </div>
          <h1 className="font-display text-[clamp(25px,3vw,34px)] font-bold leading-tight tracking-[-1.2px] text-[#26352b]">
            Good to see you, {firstName}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#223d2f]">
            Here is what is happening at <span className="font-semibold text-[#223d2f]">{farm}</span>.
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-[#f1d7cb] bg-[#fff7f2] px-4 py-3 text-[12px] text-[#94451f]" role="alert">
          Could not load the farm summary: {error}
        </p>
      )}

      <section aria-label="Poultry farm summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
          <article className="rounded-2xl border border-[#e9ece5] bg-white p-5 shadow-[0_2px_8px_rgba(34,54,39,0.025)]" key={label}>
            <div className="flex items-start justify-between">
              <span className={`grid size-11 place-items-center rounded-xl transition duration-150 ${iconStyles[tone]}`}>
                <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
              </span>
            </div>
            <p className="mt-5 text-[12px] font-medium text-[#78857b]">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-[27px] font-bold tracking-[-1px] text-[#2c3a30]">{value}</p>
              <span className="text-[10px] text-[#9aa39a]">{detail}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
        <article className="relative min-h-[300px] overflow-hidden rounded-2xl border border-[#e9ece5] bg-white p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold text-[#334238]">Egg production</h2>
              <p className="mt-1 text-[11px] text-[#8a958b]">Daily collection · Last 7 days</p>
            </div>
            <span className="rounded-lg border border-[#e9ece5] px-3 py-1.5 text-[10px] font-semibold text-[#768378]">
              {loading ? 'This week' : `${formatNumber(weekTotal)} eggs`}
            </span>
          </div>
          <div className="mt-7 flex h-[168px] items-end justify-between gap-2 border-b border-[#edf0eb] px-1">
            {weeklyEggs.map((day) => {
              const height = chartMax ? Math.max(4, Math.round((day.value / chartMax) * 100)) : 4
              return (
                <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={day.key} title={`${day.fullLabel}: ${formatNumber(day.value)} eggs`}>
                  {day.value > 0 && (
                    <span className="text-[9px] font-semibold text-[#7d8d7f]">{formatNumber(day.value)}</span>
                  )}
                  <span
                    className={`min-h-1 w-full max-w-[36px] rounded-t-md ${day.value > 0 ? 'bg-[linear-gradient(180deg,#b6d2a6,#7fa86f)]' : 'bg-[#edf3e8]'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="pb-2 text-[10px] text-[#929d93]">{day.label}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[10px] text-[#929d93]">
            {loading
              ? 'Loading egg records…'
              : weekTotal
                ? `${formatNumber(weekTotal)} eggs collected in the last 7 days · ${formatNumber(weekAverage)} per day`
                : 'No egg records in the last 7 days.'}
          </p>
        </article>

        <article className="flex min-h-[300px] flex-col rounded-2xl bg-[#1f3b2d] p-6 text-white sm:p-7">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.2} />
          </span>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[1.4px] text-emerald-300">Farm health</p>
          <h2 className="mt-2 max-w-[280px] font-display text-[21px] font-semibold leading-snug tracking-[-0.5px]">
            {loading
              ? 'Checking your flock health…'
              : attentionCount
                ? `${formatNumber(attentionCount)} ${attentionCount === 1 ? 'item needs' : 'items need'} attention.`
                : 'Your farm is in good shape.'}
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-white/65">
            {attentionCount
              ? 'Review vaccinations and disease cases in Health & care.'
              : 'No critical health alerts were raised for your current records.'}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-2">
            {healthItems.map((item) => (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5" key={item.label}>
                <dt className="text-[10px] text-white/45">{item.label}</dt>
                <dd className="mt-1 font-display text-[18px] font-semibold text-white">
                  {loading ? '—' : item.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] font-medium text-white/75">
            {loading
              ? 'Loading farm records…'
              : `${formatNumber(data?.flockSummary?.total ?? 0)} flocks · ${formatNumber(totalBirds)} birds recorded`}
          </div>
        </article>
      </section>
    </div>
  )
}
