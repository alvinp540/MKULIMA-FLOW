import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarRange, Egg, PencilLine, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { csrfFetch } from '../../services/authService'

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

const defaultForm = {
  id: '',
  flock_id: '',
  collection_date: getToday(),
  eggs_collected: '',
  broken_eggs: '',
  quality_grade: 'A',
  notes: '',
}

export default function EggProductionPage() {
  const [flocks, setFlocks] = useState([])
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState({
    total_records: 0,
    total_eggs: 0,
    broken_eggs: 0,
    grade_a: 0,
    average_daily: 0,
  })
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(defaultForm)

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [flockData, eggData] = await Promise.all([
        csrfFetch('/api/flocks/'),
        csrfFetch('/api/egg-production/'),
      ])

      const nextFlocks = flockData.flocks ?? []
      const nextRecords = eggData.records ?? []

      setFlocks(nextFlocks)
      setRecords(nextRecords)
      setSummary(eggData.summary ?? {
        total_records: 0,
        total_eggs: 0,
        broken_eggs: 0,
        grade_a: 0,
        average_daily: 0,
      })

      if (!selectedId && nextRecords[0]) {
        setSelectedId(String(nextRecords[0].id))
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedRecord = useMemo(
    () => records.find((record) => String(record.id) === String(selectedId)) ?? records[0] ?? null,
    [records, selectedId],
  )

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase()
    return records.filter((record) => {
      if (!search) return true
      const haystack = [
        record.flock?.name,
        record.flock?.farm?.name,
        record.quality_grade,
        record.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [query, records])

  function resetForm() {
    setForm({
      ...defaultForm,
      collection_date: getToday(),
      flock_id: flocks[0]?.id ? String(flocks[0].id) : '',
    })
  }

  useEffect(() => {
    if (flocks.length && !form.flock_id) {
      resetForm()
    }
  }, [flocks])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        flock_id: Number(form.flock_id),
        collection_date: form.collection_date,
        eggs_collected: Number(form.eggs_collected),
        broken_eggs: Number(form.broken_eggs || 0),
        quality_grade: form.quality_grade,
        notes: form.notes.trim(),
      }

      if (!payload.flock_id || !payload.collection_date) {
        throw new Error('Please select a flock and a collection date.')
      }
      if (!payload.eggs_collected && payload.eggs_collected !== 0) {
        throw new Error('Total eggs collected is required.')
      }
      if (payload.eggs_collected < 0 || payload.broken_eggs < 0 || payload.broken_eggs > payload.eggs_collected) {
        throw new Error('Broken eggs must be zero or greater and cannot exceed total eggs collected.')
      }

      const endpoint = form.id ? `/api/egg-production/${form.id}/` : '/api/egg-production/'
      const method = form.id ? 'PATCH' : 'POST'
      await csrfFetch(endpoint, {
        method,
        body: payload,
      })

      resetForm()
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(record) {
    setForm({
      id: record.id,
      flock_id: String(record.flock.id),
      collection_date: record.collection_date,
      eggs_collected: String(record.eggs_collected),
      broken_eggs: String(record.broken_eggs),
      quality_grade: record.quality_grade,
      notes: record.notes,
    })
  }

  async function deleteRecord(recordId) {
    setError('')
    try {
      await csrfFetch(`/api/egg-production/${recordId}/`, { method: 'DELETE' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] border border-[#e7eae2] bg-[linear-gradient(120deg,rgba(17,50,37,0.97),rgba(27,73,55,0.90)),url('/images/dashboardbackground.png')] bg-cover bg-center px-6 py-6 text-white shadow-[0_22px_70px_rgba(16,35,27,0.18)] sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d0e1b7]">Production</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">
              Egg production
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2]">
            <Sparkles className="size-3.5" />
            {summary.total_eggs || 0} eggs logged
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Records', value: summary.total_records, tone: 'green' },
          { label: 'Eggs collected', value: summary.total_eggs, tone: 'amber' },
          { label: 'Broken eggs', value: summary.broken_eggs, tone: 'rose' },
          { label: 'Avg/day', value: summary.average_daily, tone: 'stone' },
        ].map(({ label, value, tone }) => (
          <article className="rounded-2xl border border-[#e9ece5] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)]" key={label}>
            <div className="flex items-center justify-between">
              <span className={`grid size-10 place-items-center rounded-xl ${
                tone === 'green' ? 'bg-[#edf4e7] text-[#4f7f4d]' :
                tone === 'amber' ? 'bg-[#f7efdb] text-[#9b7a32]' :
                tone === 'rose' ? 'bg-[#fbe9e6] text-[#a96456]' :
                'bg-[#eef0ec] text-[#5c625d]'
              }`}>
                <Egg className="size-4" />
              </span>
              <ArrowUpRight className="text-[#a4aaa2]" size={16} />
            </div>
            <p className="mt-5 text-[12px] text-[#7d867a]">{label}</p>
            <p className="mt-1 text-[30px] font-bold tracking-[-1px] text-[#25372d]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <form className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6" onSubmit={submitForm}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Collection log</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">{form.id ? 'Update record' : 'New record'}</h2>
            </div>
            {form.id ? (
              <button className="inline-flex items-center gap-2 rounded-lg border border-[#e7eae2] px-3 py-2 text-[11px] font-semibold text-[#4c5d50]" onClick={resetForm} type="button">
                <X size={14} />
                Cancel
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Flock</span>
              <select className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none ring-0 transition focus:border-[#7ea566]" name="flock_id" onChange={updateForm} value={form.flock_id}>
                <option value="">Select flock</option>
                {flocks.map((flock) => (
                  <option key={flock.id} value={flock.id}>{flock.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Collection date</span>
              <div className="flex items-center gap-2 rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5">
                <CalendarRange className="size-4 text-[#6d7a6a]" />
                <input className="w-full bg-transparent text-[14px] text-[#1f3028] outline-none" name="collection_date" onChange={updateForm} type="date" value={form.collection_date} />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Quality grade</span>
              <select className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="quality_grade" onChange={updateForm} value={form.quality_grade}>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
                <option value="cracked">Cracked</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Total eggs</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="eggs_collected" onChange={updateForm} placeholder="Example: 170" type="number" value={form.eggs_collected} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Broken eggs</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="broken_eggs" onChange={updateForm} placeholder="0" type="number" value={form.broken_eggs} />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Notes</span>
              <textarea className="min-h-[96px] w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="notes" onChange={updateForm} placeholder="Any observation about this collection…" value={form.notes} />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-[#f6d5c9] bg-[#fff3ee] px-3 py-2 text-[12px] text-[#8d4d3f]">{error}</p>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#234d39] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#1b3d2e] disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
              <Plus size={15} />
              {saving ? 'Saving…' : form.id ? 'Update record' : 'Add record'}
            </button>
          </div>
        </form>

        <div className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Recent logs</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Production history</h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#e7eae2] bg-[#f8faf7] px-2.5 py-2 text-[#4e6453]">
              <Search size={14} />
              <input className="w-[120px] bg-transparent text-[12px] text-[#2a362f] placeholder:text-[#7c867a] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search" type="search" value={query} />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="rounded-xl bg-[#f7faf5] px-4 py-5 text-[13px] text-[#5f6d61]">Loading egg collection records…</p>
            ) : filteredRecords.length === 0 ? (
              <p className="rounded-xl bg-[#f7faf5] px-4 py-5 text-[13px] text-[#5f6d61]">No egg collection records found for this farm yet.</p>
            ) : (
              filteredRecords.map((record) => (
                <article className={`rounded-2xl border p-4 transition ${String(selectedRecord?.id ?? '') === String(record.id) ? 'border-[#bed293] bg-[#f8fbf2]' : 'border-[#edf0eb] bg-[#fbfcfa]'}`} key={record.id}>
                  <div className="flex items-start justify-between gap-3">
                    <button className="text-left" onClick={() => setSelectedId(String(record.id))} type="button">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-[#edf3e3] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#4e784a]">{record.quality_grade}</span>
                        <span className="text-[11px] text-[#758175]">{record.collection_date}</span>
                      </div>
                      <p className="mt-2 text-[16px] font-bold tracking-[-0.35px] text-[#2a352f]">{record.flock?.name}</p>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button className="rounded-lg border border-[#e7eae2] p-2 text-[#52605a] transition hover:bg-[#f3f7f1]" onClick={() => startEdit(record)} type="button" aria-label={`Edit ${record.flock?.name}`}>
                        <PencilLine size={14} />
                      </button>
                      <button className="rounded-lg border border-[#e7eae2] p-2 text-[#8b4d46] transition hover:bg-[#fbefee]" onClick={() => deleteRecord(record.id)} type="button" aria-label={`Delete ${record.flock?.name}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#839183]">Total</p>
                      <p className="mt-1 text-[18px] font-bold text-[#27372e]">{record.eggs_collected}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#839183]">Broken</p>
                      <p className="mt-1 text-[18px] font-bold text-[#27372e]">{record.broken_eggs}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#839183]">Farm</p>
                      <p className="mt-1 text-[14px] font-semibold text-[#27372e]">{record.flock?.farm?.name}</p>
                    </div>
                  </div>

                  {record.notes ? <p className="mt-3 text-[12px] leading-relaxed text-[#5f6d61]">{record.notes}</p> : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
