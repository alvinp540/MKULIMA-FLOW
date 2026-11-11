import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Bird, CalendarRange, Check, Filter, Plus, Search, Sparkles, X } from 'lucide-react'
import { csrfFetch } from '../../services/authService'

const defaultForm = {
  id: '',
  farmName: '',
  farmLocation: '',
  name: '',
  poultry_type: 'layer',
  breed: 'Kuroiler',
  initial_quantity: '',
  acquisition_date: '',
  supplier: '',
  housing_unit: '',
  purpose: 'eggs',
  notes: '',
  status: 'active',
}

export default function FlocksPage() {
  const [farms, setFarms] = useState([])
  const [flocks, setFlocks] = useState([])
  const [summary, setSummary] = useState({ total: 0, active: 0, completed: 0, archived: 0 })
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(defaultForm)

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [farmData, flockData] = await Promise.all([
        csrfFetch('/api/farms/'),
        csrfFetch('/api/flocks/'),
      ])

      const nextFarms = farmData.farms ?? []
      const nextFlocks = flockData.flocks ?? []

      setFarms(nextFarms)
      setFlocks(nextFlocks)
      setSummary(flockData.summary ?? { total: 0, active: 0, completed: 0, archived: 0 })
      if (!selectedId && nextFlocks[0]) {
        setSelectedId(String(nextFlocks[0].id))
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

  const activeFlock = useMemo(
    () => flocks.find((flock) => String(flock.id) === String(selectedId)) ?? flocks[0] ?? null,
    [flocks, selectedId],
  )

  const filteredFlocks = useMemo(() => {
    const search = query.trim().toLowerCase()
    return flocks.filter((flock) => {
      const matchesStatus = statusFilter === 'all' || flock.status === statusFilter
      const matchesSearch = !search || [flock.name, flock.breed, flock.poultry_type, flock.supplier, flock.farm?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search)
      return matchesStatus && matchesSearch
    })
  }, [query, statusFilter, flocks])

  function resetForm() {
    const preferredFarm = farms.find((farm) => farm.name.toLowerCase() === 'main farm') ?? farms[0]?.name ?? ''
    setForm({
      ...defaultForm,
      farmName: preferredFarm,
      farmLocation: '',
    })
  }

  useEffect(() => {
    if (farms.length && !form.farmName) {
      resetForm()
    }
  }, [farms])

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
        ...form,
        farmName: form.farmName.trim(),
        farmLocation: form.farmLocation.trim(),
        name: form.name.trim(),
        breed: form.breed.trim(),
        supplier: form.supplier.trim(),
        housing_unit: form.housing_unit.trim(),
        notes: form.notes.trim(),
        initial_quantity: Number(form.initial_quantity),
      }

      if (!payload.farmName || !payload.name || !payload.acquisition_date || !payload.initial_quantity) {
        throw new Error('Farm, flock name, acquisition date, and initial quantity are required.')
      }

      const endpoint = form.id ? `/api/flocks/${form.id}/` : '/api/flocks/'
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

  function startEdit(flock) {
    setForm({
      id: flock.id,
      farmName: flock.farm?.name ?? '',
      farmLocation: flock.farm?.location ?? '',
      name: flock.name,
      poultry_type: flock.poultry_type,
      breed: flock.breed,
      initial_quantity: String(flock.initial_quantity),
      acquisition_date: flock.acquisition_date,
      supplier: flock.supplier,
      housing_unit: flock.housing_unit,
      purpose: flock.purpose,
      notes: flock.notes,
      status: flock.status,
    })
  }

  async function archiveFlock(flockId) {
    setError('')
    try {
      await csrfFetch(`/api/flocks/${flockId}/`, {
        method: 'PATCH',
        body: { status: 'archived' },
      })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] border border-[#e7eae2] bg-[linear-gradient(120deg,rgba(19,53,38,0.98),rgba(33,85,60,0.88)),url('/images/dashboardbackground.png')] bg-cover bg-center px-6 py-6 text-white shadow-[0_22px_70px_rgba(16,35,27,0.18)] sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d0e1b7]">Poultry herd</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">
              Flock management
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2]">
            <Sparkles className="size-3.5" />
            {summary.active || 0} active flocks
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total flocks', value: summary.total, tone: 'green' },
          { label: 'Active', value: summary.active, tone: 'grass' },
          { label: 'Completed', value: summary.completed, tone: 'amber' },
          { label: 'Archived', value: summary.archived, tone: 'stone' },
        ].map(({ label, value, tone }) => (
          <article className="rounded-2xl border border-[#e9ece5] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)]" key={label}>
            <div className="flex items-center justify-between">
              <span className={`grid size-10 place-items-center rounded-xl ${
                tone === 'green' ? 'bg-[#edf4e7] text-[#4f7f4d]' :
                tone === 'grass' ? 'bg-[#eaf5d5] text-[#627f3f]' :
                tone === 'amber' ? 'bg-[#f9f0dc] text-[#9f7e2d]' : 'bg-[#eef0ec] text-[#5c625d]'
              }`}>
                <Bird className="size-4" />
              </span>
              <ArrowUpRight className="text-[#a4aaa2]" size={16} />
            </div>
            <p className="mt-5 text-[12px] text-[#7d867a]">{label}</p>
            <p className="mt-1 text-[30px] font-bold tracking-[-1px] text-[#25372d]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6" onSubmit={submitForm}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Registration</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">{form.id ? 'Update flock' : 'New flock'}</h2>
            </div>
            {form.id ? (
              <button className="inline-flex items-center gap-2 rounded-lg border border-[#e7eae2] px-3 py-2 text-[11px] font-semibold text-[#4c5d50]" onClick={resetForm} type="button">
                <X size={14} />
                Clear
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d] sm:col-span-2">
              Farm name
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none ring-0 transition focus:border-[#7ea66c] focus:bg-white" name="farmName" onChange={updateForm} placeholder="Main farm" value={form.farmName} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d] sm:col-span-2">
              Farm location
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="farmLocation" onChange={updateForm} placeholder="Kisumu, Kenya" value={form.farmLocation} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Flock name
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="name" onChange={updateForm} placeholder="Layer House A" value={form.name} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Poultry type
              <select className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="poultry_type" onChange={updateForm} value={form.poultry_type}>
                <option value="broiler">Broiler</option>
                <option value="layer">Layer</option>
                <option value="kienyeji">Kienyeji</option>
                <option value="improved_kienyeji">Improved Kienyeji</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Breed
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="breed" onChange={updateForm} placeholder="Kuroiler" value={form.breed} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Initial quantity
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" min="1" name="initial_quantity" onChange={updateForm} placeholder="120" type="number" value={form.initial_quantity} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Acquisition date
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="acquisition_date" onChange={updateForm} type="date" value={form.acquisition_date} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Source / supplier
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="supplier" onChange={updateForm} placeholder="Local hatchery" value={form.supplier} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Housing unit
              <input className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="housing_unit" onChange={updateForm} placeholder="House 1" value={form.housing_unit} />
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Purpose
              <select className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="purpose" onChange={updateForm} value={form.purpose}>
                <option value="meat">Meat</option>
                <option value="eggs">Eggs</option>
                <option value="breeding">Breeding</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d]">
              Status
              <select className="rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="status" onChange={updateForm} value={form.status}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-[12px] font-semibold text-[#4a554d] sm:col-span-2">
              Notes
              <textarea className="min-h-[90px] rounded-xl border border-[#e1e7df] bg-[#f9faf8] px-3 py-2.5 text-[13px] text-[#24372d] outline-none transition focus:border-[#7ea66c] focus:bg-white" name="notes" onChange={updateForm} placeholder="Additional flock or management notes" value={form.notes} />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-[#f0d0c0] bg-[#fff8f3] px-3 py-2 text-[12px] text-[#8c4d2c]" role="alert">{error}</p>
          ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-[#dfe7dc] bg-white px-4 py-2.5 text-[12px] font-semibold text-[#3a5347]" onClick={resetForm} type="button">
              Reset
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#285a38] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_12px_24px_rgba(40,90,56,0.2)] disabled:cursor-wait disabled:opacity-70" disabled={saving} type="submit">
              {saving ? 'Saving…' : form.id ? 'Update flock' : 'Register flock'}
              <Plus size={15} />
            </button>
          </div>
        </form>

        <section className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Records</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Flock register</h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#e5eae4] bg-[#f8faf7] px-3 py-2 text-[12px] text-[#4e5f52]">
              <Filter size={14} />
              <select className="bg-transparent font-medium outline-none" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#e5eae4] bg-[#f8faf7] px-3 py-2.5 text-[12px] text-[#4f5d52]">
            <Search size={15} />
            <input className="w-full bg-transparent outline-none placeholder:text-[#839186]" onChange={(event) => setQuery(event.target.value)} placeholder="Search flocks, breed or supplier" value={query} />
          </div>

          {loading ? (
            <p className="rounded-xl border border-[#edf0eb] bg-[#f9faf8] px-4 py-8 text-center text-[13px] text-[#647067]">Loading flock data…</p>
          ) : filteredFlocks.length === 0 ? (
            <p className="rounded-xl border border-[#edf0eb] bg-[#f9faf8] px-4 py-8 text-center text-[13px] text-[#647067]">No flocks match your filters yet.</p>
          ) : (
            <div className="space-y-3">
              {filteredFlocks.map((flock) => (
                <button
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${selectedId === String(flock.id) ? 'border-[#7ca66b] bg-[#f2f8ec]' : 'border-[#e8ece6] bg-[#fbfcfb]'}`}
                  key={flock.id}
                  onClick={() => setSelectedId(String(flock.id))}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#27372d]">{flock.name}</span>
                      <span className="rounded-full bg-[#edf3e7] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[1.3px] text-[#5f7e5c]">{flock.status}</span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-[#708078]">{flock.breed} · {flock.poultry_type} · {flock.farm?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#516656]">{flock.initial_quantity} birds</span>
                    <ArrowUpRight className="text-[#6c7b70]" size={15} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      {activeFlock ? (
        <section className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Flock detail</p>
              <h3 className="mt-2 text-[24px] font-bold tracking-[-0.8px] text-[#27382d]">{activeFlock.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-[12px] font-semibold text-[#3a5347]" onClick={() => startEdit(activeFlock)} type="button">
                Edit
              </button>
              <button className="rounded-xl bg-[#5c7f5d] px-3 py-2 text-[12px] font-semibold text-white" onClick={() => archiveFlock(activeFlock.id)} type="button">
                Archive
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#f8faf7] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[1.3px] text-[#738179]">Farm</p>
              <p className="mt-2 text-[16px] font-bold text-[#24372d]">{activeFlock.farm?.name ?? 'Unassigned'}</p>
            </div>
            <div className="rounded-2xl bg-[#f8faf7] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[1.3px] text-[#738179]">Population</p>
              <p className="mt-2 text-[16px] font-bold text-[#24372d]">{activeFlock.initial_quantity} birds</p>
            </div>
            <div className="rounded-2xl bg-[#f8faf7] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[1.3px] text-[#738179]">Acquired</p>
              <p className="mt-2 text-[16px] font-bold text-[#24372d]">{activeFlock.acquisition_date}</p>
            </div>
            <div className="rounded-2xl bg-[#f8faf7] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[1.3px] text-[#738179]">Status</p>
              <p className="mt-2 text-[16px] font-bold text-[#24372d]">{activeFlock.status}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-[#e8ece6] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#627163]">
                <CalendarRange size={15} />
                <span className="text-[11px] font-bold uppercase tracking-[1.2px]">Key details</span>
              </div>
              <ul className="space-y-2 text-[12px] text-[#4b5b50]">
                <li><span className="font-semibold text-[#294334]">Breed:</span> {activeFlock.breed}</li>
                <li><span className="font-semibold text-[#294334]">Poultry type:</span> {activeFlock.poultry_type}</li>
                <li><span className="font-semibold text-[#294334]">Purpose:</span> {activeFlock.purpose}</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#e8ece6] p-4">
              <div className="mb-2 flex items-center gap-2 text-[#627163]">
                <Bird size={15} />
                <span className="text-[11px] font-bold uppercase tracking-[1.2px]">Housing</span>
              </div>
              <ul className="space-y-2 text-[12px] text-[#4b5b50]">
                <li><span className="font-semibold text-[#294334]">Unit:</span> {activeFlock.housing_unit || 'Not set'}</li>
                <li><span className="font-semibold text-[#294334]">Supplier:</span> {activeFlock.supplier || 'Unknown'}</li>
                <li><span className="font-semibold text-[#294334]">Location:</span> {activeFlock.farm?.location || 'Not provided'}</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#e8ece6] p-4 sm:col-span-2 xl:col-span-1">
              <div className="mb-2 flex items-center gap-2 text-[#627163]">
                <Check size={15} />
                <span className="text-[11px] font-bold uppercase tracking-[1.2px]">Notes</span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#4b5b50]">{activeFlock.notes || 'No notes recorded yet.'}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
