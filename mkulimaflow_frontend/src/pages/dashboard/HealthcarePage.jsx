import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardPlus,
  Crosshair,
  HeartPulse,
  ShieldCheck,
  Syringe,
  TrendingUp,
  UserRoundPlus,
} from 'lucide-react'
import { csrfFetch } from '../../services/authService'

const today = new Date().toISOString().slice(0, 10)

const defaultRecordForm = {
  flock_id: '',
  record_date: today,
  status: 'healthy',
  body_temperature: '',
  condition_score: '',
  observed_by: '',
  notes: '',
}

const defaultVaccinationForm = {
  flock_id: '',
  vaccine_name: '',
  scheduled_date: today,
  due_date: today,
  status: 'pending',
  administered_by: '',
  administered_date: '',
  batch_number: '',
  notes: '',
}

const defaultDiseaseForm = {
  flock_id: '',
  disease_name: '',
  diagnosis_date: today,
  severity: 'mild',
  status: 'open',
  symptoms: '',
  diagnosis: '',
  treatment_plan: '',
  notes: '',
}

const defaultTreatmentForm = {
  flock_id: '',
  disease_case_id: '',
  treatment_name: '',
  medication: '',
  dosage: '',
  start_date: today,
  end_date: '',
  status: 'pending',
  veterinarian: '',
  notes: '',
}

const defaultMortalityForm = {
  flock_id: '',
  record_date: today,
  deaths: '',
  culls: '',
  cause: '',
  notes: '',
}

const defaultScheduleForm = {
  flock_id: '',
  title: '',
  category: 'checkup',
  scheduled_for: today,
  status: 'pending',
  assigned_to: '',
  notes: '',
}

const defaultVetForm = {
  flock_id: '',
  visit_date: today,
  veterinarian_name: '',
  purpose: '',
  findings: '',
  recommendations: '',
  notes: '',
}

export default function HealthcarePage() {
  const [flocks, setFlocks] = useState([])
  const [dashboard, setDashboard] = useState({ summary: {}, alerts: [] })
  const [records, setRecords] = useState([])
  const [vaccinationPlans, setVaccinationPlans] = useState([])
  const [vaccinationRecords, setVaccinationRecords] = useState([])
  const [diseaseCases, setDiseaseCases] = useState([])
  const [treatments, setTreatments] = useState([])
  const [mortality, setMortality] = useState([])
  const [schedules, setSchedules] = useState([])
  const [vetVisits, setVetVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [recordForm, setRecordForm] = useState(defaultRecordForm)
  const [vaccinationForm, setVaccinationForm] = useState(defaultVaccinationForm)
  const [diseaseForm, setDiseaseForm] = useState(defaultDiseaseForm)
  const [treatmentForm, setTreatmentForm] = useState(defaultTreatmentForm)
  const [mortalityForm, setMortalityForm] = useState(defaultMortalityForm)
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm)
  const [vetForm, setVetForm] = useState(defaultVetForm)

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [flockResponse, dashboardResponse, recordsResponse, vaccinationResponse, diseaseResponse, treatmentResponse, mortalityResponse, scheduleResponse, vetResponse] = await Promise.all([
        csrfFetch('/api/flocks/'),
        csrfFetch('/api/health/dashboard/'),
        csrfFetch('/api/health/records/'),
        csrfFetch('/api/health/vaccinations/'),
        csrfFetch('/api/health/diseases/'),
        csrfFetch('/api/health/treatments/'),
        csrfFetch('/api/health/mortality/'),
        csrfFetch('/api/health/schedules/'),
        csrfFetch('/api/health/veterinary-visits/'),
      ])

      setFlocks(flockResponse.flocks ?? [])
      setDashboard(dashboardResponse)
      setRecords(recordsResponse.records ?? [])
      setVaccinationPlans(vaccinationResponse.plans ?? [])
      setVaccinationRecords(vaccinationResponse.records ?? [])
      setDiseaseCases(diseaseResponse.cases ?? [])
      setTreatments(treatmentResponse.records ?? [])
      setMortality(mortalityResponse.records ?? [])
      setSchedules(scheduleResponse.records ?? [])
      setVetVisits(vetResponse.records ?? [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (flocks.length > 0) {
      setRecordForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
      setVaccinationForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
      setDiseaseForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
      setTreatmentForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
      setMortalityForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
      setScheduleForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
      setVetForm((current) => ({ ...current, flock_id: current.flock_id || String(flocks[0].id) }))
    }
  }, [flocks])

  const summaryCards = useMemo(() => [
    { label: 'Healthy flocks', value: dashboard.summary?.healthy_flocks ?? 0, icon: HeartPulse, tone: 'emerald' },
    { label: 'Active disease cases', value: dashboard.summary?.active_disease_cases ?? 0, icon: AlertTriangle, tone: 'amber' },
    { label: 'Vaccinations due', value: dashboard.summary?.vaccinations_due ?? 0, icon: Syringe, tone: 'sky' },
    { label: 'Mortality rate', value: `${dashboard.summary?.mortality_rate ?? 0}%`, icon: TrendingUp, tone: 'rose' },
  ], [dashboard])

  async function submitRecord(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/records/', {
        method: 'POST',
        body: {
          flock_id: Number(recordForm.flock_id),
          record_date: recordForm.record_date,
          status: recordForm.status,
          body_temperature: recordForm.body_temperature ? Number(recordForm.body_temperature) : null,
          condition_score: recordForm.condition_score.trim(),
          observed_by: recordForm.observed_by.trim(),
          notes: recordForm.notes.trim(),
        },
      })

      setRecordForm({ ...defaultRecordForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitVaccination(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/vaccinations/', {
        method: 'POST',
        body: {
          flock_id: Number(vaccinationForm.flock_id),
          vaccine_name: vaccinationForm.vaccine_name.trim(),
          scheduled_date: vaccinationForm.scheduled_date,
          due_date: vaccinationForm.due_date,
          status: vaccinationForm.status,
          administered_by: vaccinationForm.administered_by.trim(),
          administered_date: vaccinationForm.administered_date || null,
          batch_number: vaccinationForm.batch_number.trim(),
          notes: vaccinationForm.notes.trim(),
        },
      })

      setVaccinationForm({ ...defaultVaccinationForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitDisease(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/diseases/', {
        method: 'POST',
        body: {
          flock_id: Number(diseaseForm.flock_id),
          disease_name: diseaseForm.disease_name.trim(),
          diagnosis_date: diseaseForm.diagnosis_date,
          severity: diseaseForm.severity,
          status: diseaseForm.status,
          symptoms: diseaseForm.symptoms.trim(),
          diagnosis: diseaseForm.diagnosis.trim(),
          treatment_plan: diseaseForm.treatment_plan.trim(),
          notes: diseaseForm.notes.trim(),
        },
      })

      setDiseaseForm({ ...defaultDiseaseForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitTreatment(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/treatments/', {
        method: 'POST',
        body: {
          flock_id: Number(treatmentForm.flock_id),
          disease_case_id: treatmentForm.disease_case_id ? Number(treatmentForm.disease_case_id) : null,
          treatment_name: treatmentForm.treatment_name.trim(),
          medication: treatmentForm.medication.trim(),
          dosage: treatmentForm.dosage.trim(),
          start_date: treatmentForm.start_date,
          end_date: treatmentForm.end_date || null,
          status: treatmentForm.status,
          veterinarian: treatmentForm.veterinarian.trim(),
          notes: treatmentForm.notes.trim(),
        },
      })

      setTreatmentForm({ ...defaultTreatmentForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitMortality(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/mortality/', {
        method: 'POST',
        body: {
          flock_id: Number(mortalityForm.flock_id),
          record_date: mortalityForm.record_date,
          deaths: Number(mortalityForm.deaths || 0),
          culls: Number(mortalityForm.culls || 0),
          cause: mortalityForm.cause.trim(),
          notes: mortalityForm.notes.trim(),
        },
      })

      setMortalityForm({ ...defaultMortalityForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitSchedule(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/schedules/', {
        method: 'POST',
        body: {
          flock_id: Number(scheduleForm.flock_id),
          title: scheduleForm.title.trim(),
          category: scheduleForm.category,
          scheduled_for: scheduleForm.scheduled_for,
          status: scheduleForm.status,
          assigned_to: scheduleForm.assigned_to.trim(),
          notes: scheduleForm.notes.trim(),
        },
      })

      setScheduleForm({ ...defaultScheduleForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitVet(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await csrfFetch('/api/health/veterinary-visits/', {
        method: 'POST',
        body: {
          flock_id: Number(vetForm.flock_id),
          visit_date: vetForm.visit_date,
          veterinarian_name: vetForm.veterinarian_name.trim(),
          purpose: vetForm.purpose.trim(),
          findings: vetForm.findings.trim(),
          recommendations: vetForm.recommendations.trim(),
          notes: vetForm.notes.trim(),
        },
      })

      setVetForm({ ...defaultVetForm, flock_id: flocks[0] ? String(flocks[0].id) : '' })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const updateFormValue = (setter, field, value) => setter((current) => ({ ...current, [field]: value }))

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] border border-[#dde5d9] bg-[linear-gradient(120deg,rgba(16,58,42,0.97),rgba(27,91,63,0.9)),url('/images/dashboardbackground.png')] bg-cover bg-center p-6 text-white shadow-[0_20px_60px_rgba(14,41,28,0.18)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d7ebbe]">Poultry healthcare</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">Health & care</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf8d6]">
            <ShieldCheck className="size-3.5" />
            {dashboard.alerts?.length ?? 0} health alerts
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-[#e8ece3] bg-white p-5 shadow-[0_14px_30px_rgba(17,34,24,0.05)]">
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

      <section className="rounded-2xl border border-[#e9eee7] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#1d332a]">Health alerts</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(dashboard.alerts ?? []).map((alert) => (
            <div key={`${alert.title}-${alert.type}`} className="rounded-xl border border-[#eaf1e8] bg-[#f8faf6] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#254739]">
                <Activity className="size-4 text-[#2b7a54]" />
                {alert.title}
              </div>
              <p className="text-sm text-[#5f6c63]">{alert.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-7 xl:grid-cols-2">
        <form onSubmit={submitRecord} className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <ClipboardPlus className="size-5 text-[#2a7b3c]" />
            <h2 className="text-lg font-semibold text-[#1d332a]">Health record</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Flock
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.flock_id} onChange={(event) => updateFormValue(setRecordForm, 'flock_id', event.target.value)}>
                {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.record_date} onChange={(event) => updateFormValue(setRecordForm, 'record_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Status
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.status} onChange={(event) => updateFormValue(setRecordForm, 'status', event.target.value)}>
                <option value="healthy">Healthy</option>
                <option value="watch">Watch</option>
                <option value="sick">Sick</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Temperature (°C)
              <input type="number" step="0.1" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.body_temperature} onChange={(event) => updateFormValue(setRecordForm, 'body_temperature', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Condition score
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.condition_score} onChange={(event) => updateFormValue(setRecordForm, 'condition_score', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Observed by
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.observed_by} onChange={(event) => updateFormValue(setRecordForm, 'observed_by', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Notes
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={recordForm.notes} onChange={(event) => updateFormValue(setRecordForm, 'notes', event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save health record'}</button>
        </form>

        <form onSubmit={submitVaccination} className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <Syringe className="size-5 text-[#2a7b3c]" />
            <h2 className="text-lg font-semibold text-[#1d332a]">Vaccination</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Flock
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.flock_id} onChange={(event) => updateFormValue(setVaccinationForm, 'flock_id', event.target.value)}>
                {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Vaccine name
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.vaccine_name} onChange={(event) => updateFormValue(setVaccinationForm, 'vaccine_name', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Scheduled date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.scheduled_date} onChange={(event) => updateFormValue(setVaccinationForm, 'scheduled_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Due date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.due_date} onChange={(event) => updateFormValue(setVaccinationForm, 'due_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Status
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.status} onChange={(event) => updateFormValue(setVaccinationForm, 'status', event.target.value)}>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
                <option value="skipped">Skipped</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Administered by
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.administered_by} onChange={(event) => updateFormValue(setVaccinationForm, 'administered_by', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Administered date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.administered_date} onChange={(event) => updateFormValue(setVaccinationForm, 'administered_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Batch number
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.batch_number} onChange={(event) => updateFormValue(setVaccinationForm, 'batch_number', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Notes
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vaccinationForm.notes} onChange={(event) => updateFormValue(setVaccinationForm, 'notes', event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save vaccination'}</button>
        </form>
      </section>

      <section className="grid gap-7 xl:grid-cols-2">
        <form onSubmit={submitDisease} className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <Crosshair className="size-5 text-[#d7842b]" />
            <h2 className="text-lg font-semibold text-[#1d332a]">Disease case</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Flock
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.flock_id} onChange={(event) => updateFormValue(setDiseaseForm, 'flock_id', event.target.value)}>
                {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Disease name
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.disease_name} onChange={(event) => updateFormValue(setDiseaseForm, 'disease_name', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Diagnosis date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.diagnosis_date} onChange={(event) => updateFormValue(setDiseaseForm, 'diagnosis_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Severity
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.severity} onChange={(event) => updateFormValue(setDiseaseForm, 'severity', event.target.value)}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Status
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.status} onChange={(event) => updateFormValue(setDiseaseForm, 'status', event.target.value)}>
                <option value="open">Open</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Symptoms
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.symptoms} onChange={(event) => updateFormValue(setDiseaseForm, 'symptoms', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Diagnosis
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.diagnosis} onChange={(event) => updateFormValue(setDiseaseForm, 'diagnosis', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Treatment plan
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.treatment_plan} onChange={(event) => updateFormValue(setDiseaseForm, 'treatment_plan', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Notes
              <textarea rows="2" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={diseaseForm.notes} onChange={(event) => updateFormValue(setDiseaseForm, 'notes', event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save disease case'}</button>
        </form>

        <form onSubmit={submitTreatment} className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <HeartPulse className="size-5 text-[#2b7a54]" />
            <h2 className="text-lg font-semibold text-[#1d332a]">Treatment</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Flock
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.flock_id} onChange={(event) => updateFormValue(setTreatmentForm, 'flock_id', event.target.value)}>
                {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Disease case ID (optional)
              <input type="number" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.disease_case_id} onChange={(event) => updateFormValue(setTreatmentForm, 'disease_case_id', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Treatment name
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.treatment_name} onChange={(event) => updateFormValue(setTreatmentForm, 'treatment_name', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Medication
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.medication} onChange={(event) => updateFormValue(setTreatmentForm, 'medication', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Dosage
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.dosage} onChange={(event) => updateFormValue(setTreatmentForm, 'dosage', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Start date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.start_date} onChange={(event) => updateFormValue(setTreatmentForm, 'start_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              End date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.end_date} onChange={(event) => updateFormValue(setTreatmentForm, 'end_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Status
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.status} onChange={(event) => updateFormValue(setTreatmentForm, 'status', event.target.value)}>
                <option value="pending">Pending</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Veterinarian
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.veterinarian} onChange={(event) => updateFormValue(setTreatmentForm, 'veterinarian', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Notes
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={treatmentForm.notes} onChange={(event) => updateFormValue(setTreatmentForm, 'notes', event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save treatment'}</button>
        </form>
      </section>

      <section className="grid gap-7 xl:grid-cols-2">
        <form onSubmit={submitMortality} className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="size-5 text-[#b33a4f]" />
            <h2 className="text-lg font-semibold text-[#1d332a]">Mortality</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Flock
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={mortalityForm.flock_id} onChange={(event) => updateFormValue(setMortalityForm, 'flock_id', event.target.value)}>
                {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Date
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={mortalityForm.record_date} onChange={(event) => updateFormValue(setMortalityForm, 'record_date', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Cause
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={mortalityForm.cause} onChange={(event) => updateFormValue(setMortalityForm, 'cause', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Deaths
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={mortalityForm.deaths} onChange={(event) => updateFormValue(setMortalityForm, 'deaths', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Culls
              <input type="number" min="0" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={mortalityForm.culls} onChange={(event) => updateFormValue(setMortalityForm, 'culls', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Notes
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={mortalityForm.notes} onChange={(event) => updateFormValue(setMortalityForm, 'notes', event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save mortality record'}</button>
        </form>

        <form onSubmit={submitSchedule} className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <div className="mb-4 flex items-center gap-3">
            <CalendarClock className="size-5 text-[#2d6fa7]" />
            <h2 className="text-lg font-semibold text-[#1d332a]">Health schedule</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Flock
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.flock_id} onChange={(event) => updateFormValue(setScheduleForm, 'flock_id', event.target.value)}>
                {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Title
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.title} onChange={(event) => updateFormValue(setScheduleForm, 'title', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Category
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.category} onChange={(event) => updateFormValue(setScheduleForm, 'category', event.target.value)}>
                <option value="vaccination">Vaccination</option>
                <option value="checkup">Checkup</option>
                <option value="treatment">Treatment</option>
                <option value="cleaning">Cleaning</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Scheduled for
              <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.scheduled_for} onChange={(event) => updateFormValue(setScheduleForm, 'scheduled_for', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Status
              <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.status} onChange={(event) => updateFormValue(setScheduleForm, 'status', event.target.value)}>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#415348]">
              Assigned to
              <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.assigned_to} onChange={(event) => updateFormValue(setScheduleForm, 'assigned_to', event.target.value)} />
            </label>
            <label className="text-sm font-medium text-[#415348] md:col-span-2">
              Notes
              <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={scheduleForm.notes} onChange={(event) => updateFormValue(setScheduleForm, 'notes', event.target.value)} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save schedule'}</button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
        <div className="mb-4 flex items-center gap-3">
          <UserRoundPlus className="size-5 text-[#2a7b3c]" />
          <h2 className="text-lg font-semibold text-[#1d332a]">Veterinary visit</h2>
        </div>
        <form onSubmit={submitVet} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-[#415348] md:col-span-2">
            Flock
            <select className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.flock_id} onChange={(event) => updateFormValue(setVetForm, 'flock_id', event.target.value)}>
              {flocks.map((flock) => <option key={flock.id} value={flock.id}>{flock.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#415348]">
            Visit date
            <input type="date" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.visit_date} onChange={(event) => updateFormValue(setVetForm, 'visit_date', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-[#415348]">
            Veterinarian name
            <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.veterinarian_name} onChange={(event) => updateFormValue(setVetForm, 'veterinarian_name', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-[#415348] md:col-span-2">
            Purpose
            <input type="text" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.purpose} onChange={(event) => updateFormValue(setVetForm, 'purpose', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-[#415348] md:col-span-2">
            Findings
            <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.findings} onChange={(event) => updateFormValue(setVetForm, 'findings', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-[#415348] md:col-span-2">
            Recommendations
            <textarea rows="3" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.recommendations} onChange={(event) => updateFormValue(setVetForm, 'recommendations', event.target.value)} />
          </label>
          <label className="text-sm font-medium text-[#415348] md:col-span-2">
            Notes
            <textarea rows="2" className="mt-1 w-full rounded-xl border border-[#dfe7df] bg-[#f9faf7] px-3 py-2.5 text-sm outline-none focus:border-[#7fae72]" value={vetForm.notes} onChange={(event) => updateFormValue(setVetForm, 'notes', event.target.value)} />
          </label>
          <button type="submit" disabled={saving} className="md:col-span-2 mt-1 rounded-xl bg-[#203f30] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163b2c] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : 'Save veterinary visit'}</button>
        </form>
      </section>

      <section className="grid gap-7 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <h2 className="text-lg font-semibold text-[#1d332a]">Recent reports</h2>
          <div className="mt-4 space-y-3 text-sm text-[#4f5f56]">
            {records.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#23402d]">{item.flock_name}</span>
                  <span className="rounded-full bg-[#eaf7ea] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#2e7d4d]">{item.status}</span>
                </div>
                <div className="mt-2 text-xs text-[#66756d]">{item.record_date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e7ebe4] bg-white p-5 shadow-[0_12px_28px_rgba(18,32,25,0.04)]">
          <h2 className="text-lg font-semibold text-[#1d332a]">Upcoming schedule</h2>
          <div className="mt-4 space-y-3 text-sm text-[#4f5f56]">
            {schedules.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-[#edf1eb] bg-[#fafcf8] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-[#23402d]">{item.title}</span>
                  <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#3b78ba]">{item.status}</span>
                </div>
                <div className="mt-2 text-xs text-[#66756d]">{item.flock_name} • {item.scheduled_for}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? <div className="py-4 text-sm text-[#5f6c63]">Loading health data…</div> : null}
    </div>
  )
}
