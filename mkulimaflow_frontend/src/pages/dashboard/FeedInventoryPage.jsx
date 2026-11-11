import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Boxes, CalendarRange, CircleAlert, PackageCheck, PackageOpen, Plus, Search, Sparkles, Truck, Warehouse } from 'lucide-react'
import { csrfFetch } from '../../services/authService'

const defaultItemForm = {
  id: '',
  name: '',
  category: 'layer_mash',
  brand: '',
  unit: 'kg',
  unit_cost: '',
  minimum_stock: '',
  current_stock: '',
  supplier: '',
  expiry_date: '',
  notes: '',
}

const defaultMovementForm = {
  feed_id: '',
  flock_id: '',
  quantity: '',
  unit_cost: '',
  movement_date: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
}

export default function FeedInventoryPage() {
  const [items, setItems] = useState([])
  const [flocks, setFlocks] = useState([])
  const [movements, setMovements] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [itemForm, setItemForm] = useState(defaultItemForm)
  const [movementForm, setMovementForm] = useState(defaultMovementForm)

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [feedItems, feedMovements, feedLowStock, flockData] = await Promise.all([
        csrfFetch('/api/feed/items/'),
        csrfFetch('/api/feed/movements/'),
        csrfFetch('/api/feed/low-stock/'),
        csrfFetch('/api/flocks/'),
      ])

      setItems(feedItems.items ?? [])
      setMovements(feedMovements.movements ?? [])
      setLowStock(feedLowStock.items ?? [])
      setFlocks(flockData.flocks ?? [])
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
    if (flocks.length && !movementForm.flock_id) {
      setMovementForm((current) => ({ ...current, flock_id: String(flocks[0].id) }))
    }
  }, [flocks])

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((item) => {
      if (!term) return true
      const haystack = [item.name, item.category, item.brand, item.supplier, item.notes].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [items, query])

  const summary = useMemo(() => {
    const totalInventory = items.reduce((sum, item) => sum + Number(item.current_stock || 0), 0)
    const lowStockCount = lowStock.length
    const totalFeeds = items.length
    const stockValue = items.reduce((sum, item) => sum + Number(item.current_stock || 0) * Number(item.unit_cost || 0), 0)
    return {
      totalFeeds,
      totalInventory,
      lowStockCount,
      stockValue,
    }
  }, [items, lowStock])

  function updateItemForm(event) {
    const { name, value } = event.target
    setItemForm((current) => ({ ...current, [name]: value }))
  }

  function updateMovementForm(event) {
    const { name, value } = event.target
    setMovementForm((current) => ({ ...current, [name]: value }))
  }

  async function submitItem(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        name: itemForm.name.trim(),
        category: itemForm.category,
        brand: itemForm.brand.trim(),
        unit: itemForm.unit.trim() || 'kg',
        unit_cost: Number(itemForm.unit_cost || 0),
        minimum_stock: Number(itemForm.minimum_stock || 0),
        current_stock: Number(itemForm.current_stock || 0),
        supplier: itemForm.supplier.trim(),
        expiry_date: itemForm.expiry_date || null,
        notes: itemForm.notes.trim(),
      }

      if (!payload.name) {
        throw new Error('Feed item name is required.')
      }

      await csrfFetch('/api/feed/items/', {
        method: 'POST',
        body: payload,
      })

      setItemForm(defaultItemForm)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function submitMovement(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        feed_id: Number(movementForm.feed_id),
        flock_id: movementForm.flock_id ? Number(movementForm.flock_id) : null,
        quantity: Number(movementForm.quantity),
        unit_cost: Number(movementForm.unit_cost || 0),
        movement_date: movementForm.movement_date,
        reference: movementForm.reference.trim(),
        notes: movementForm.notes.trim(),
      }

      if (!payload.feed_id || !payload.quantity) {
        throw new Error('Select a feed item and enter a quantity.')
      }
      if (payload.quantity <= 0) {
        throw new Error('Quantity must be greater than zero.')
      }

      await csrfFetch('/api/feed/stock/', {
        method: 'POST',
        body: payload,
      })

      setMovementForm({
        ...defaultMovementForm,
        movement_date: new Date().toISOString().slice(0, 10),
        flock_id: flocks[0] ? String(flocks[0].id) : '',
      })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function issueStock(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        feed_id: Number(movementForm.feed_id),
        flock_id: movementForm.flock_id ? Number(movementForm.flock_id) : null,
        quantity: Number(movementForm.quantity),
        movement_date: movementForm.movement_date,
        reference: movementForm.reference.trim(),
        notes: movementForm.notes.trim(),
      }

      if (!payload.feed_id || !payload.quantity) {
        throw new Error('Select a feed item and provide a quantity.')
      }

      await csrfFetch('/api/feed/stock-out/', {
        method: 'POST',
        body: payload,
      })

      setMovementForm({
        ...defaultMovementForm,
        movement_date: new Date().toISOString().slice(0, 10),
        flock_id: flocks[0] ? String(flocks[0].id) : '',
      })
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[24px] border border-[#e7eae2] bg-[linear-gradient(120deg,rgba(18,49,37,0.96),rgba(35,89,62,0.86)),url('/images/dashboardbackground.png')] bg-cover bg-center px-6 py-6 text-white shadow-[0_22px_70px_rgba(16,35,27,0.18)] sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.8px] text-[#d0e1b7]">Inventory</p>
            <h1 className="mt-3 font-display text-[clamp(28px,3vw,42px)] font-semibold tracking-[-1.4px] text-white">Feed inventory</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#edf7d2]">
            <Sparkles className="size-3.5" />
            {lowStock.length} feed items below minimum stock
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Feed items', value: summary.totalFeeds, tone: 'green', icon: PackageOpen },
          { label: 'Stock on hand', value: `${summary.totalInventory.toFixed(0)} kg`, tone: 'amber', icon: Warehouse },
          { label: 'Low stock alerts', value: summary.lowStockCount, tone: 'rose', icon: CircleAlert },
          { label: 'Inventory value', value: `KSh ${summary.stockValue.toFixed(0)}`, tone: 'stone', icon: Boxes },
        ].map(({ label, value, tone, icon: Icon }) => (
          <article className="rounded-2xl border border-[#e9ece5] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)]" key={label}>
            <div className="flex items-center justify-between">
              <span className={`grid size-10 place-items-center rounded-xl ${
                tone === 'green' ? 'bg-[#edf4e7] text-[#4f7f4d]' :
                tone === 'amber' ? 'bg-[#f7efdb] text-[#9b7a32]' :
                tone === 'rose' ? 'bg-[#fbe9e6] text-[#a96456]' :
                'bg-[#eef0ec] text-[#5c625d]'
              }`}>
                <Icon className="size-4" />
              </span>
              <ArrowUpRight className="text-[#a4aaa2]" size={16} />
            </div>
            <p className="mt-5 text-[12px] text-[#7d867a]">{label}</p>
            <p className="mt-1 text-[30px] font-bold tracking-[-1px] text-[#25372d]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6" onSubmit={submitItem}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Catalog</p>
              <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Register feed</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Feed name</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="name" onChange={updateItemForm} placeholder="Broiler Starter" type="text" value={itemForm.name} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Category</span>
              <select className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="category" onChange={updateItemForm} value={itemForm.category}>
                <option value="broiler_starter">Broiler Starter</option>
                <option value="broiler_grower">Broiler Grower</option>
                <option value="broiler_finisher">Broiler Finisher</option>
                <option value="layer_mash">Layer Mash</option>
                <option value="chick_mash">Chick Mash</option>
                <option value="grower_mash">Grower Mash</option>
                <option value="kienyeji_feed">Kienyeji Feed</option>
                <option value="concentrate">Concentrate</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Brand</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="brand" onChange={updateItemForm} placeholder="Backbone Feed" type="text" value={itemForm.brand} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Unit</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="unit" onChange={updateItemForm} placeholder="kg" type="text" value={itemForm.unit} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Unit cost</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="unit_cost" onChange={updateItemForm} placeholder="120" type="number" value={itemForm.unit_cost} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Minimum stock</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="minimum_stock" onChange={updateItemForm} placeholder="250" type="number" value={itemForm.minimum_stock} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Current stock</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="current_stock" onChange={updateItemForm} placeholder="100" type="number" value={itemForm.current_stock} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Supplier</span>
              <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="supplier" onChange={updateItemForm} placeholder="Apex Feeds" type="text" value={itemForm.supplier} />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Expiry date</span>
              <div className="flex items-center gap-2 rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5">
                <CalendarRange className="size-4 text-[#6d7a6a]" />
                <input className="w-full bg-transparent text-[14px] text-[#1f3028] outline-none" name="expiry_date" onChange={updateItemForm} type="date" value={itemForm.expiry_date} />
              </div>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Notes</span>
              <textarea className="min-h-[100px] w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="notes" onChange={updateItemForm} placeholder="Storage notes or feed specification..." value={itemForm.notes} />
            </label>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-[#f6d5c9] bg-[#fff3ee] px-3 py-2 text-[12px] text-[#8d4d3f]">{error}</p>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#234d39] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#1b3d2e] disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
              <Plus size={15} />
              {saving ? 'Saving…' : 'Add feed item'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <form className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6" onSubmit={submitMovement}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Stock in</p>
                <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Receive stock</h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Feed item</span>
                <select className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="feed_id" onChange={updateMovementForm} value={movementForm.feed_id}>
                  <option value="">Select feed item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Quantity</span>
                <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="quantity" onChange={updateMovementForm} placeholder="200" type="number" value={movementForm.quantity} />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Unit cost</span>
                <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="unit_cost" onChange={updateMovementForm} placeholder="120" type="number" value={movementForm.unit_cost} />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Date</span>
                <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="movement_date" onChange={updateMovementForm} type="date" value={movementForm.movement_date} />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Reference</span>
                <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="reference" onChange={updateMovementForm} placeholder="Purchase order" type="text" value={movementForm.reference} />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Notes</span>
                <textarea className="min-h-[84px] w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="notes" onChange={updateMovementForm} placeholder="Delivery notes..." value={movementForm.notes} />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#1d3f31] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#173326]" type="submit">
                <PackageCheck size={15} />
                Record stock in
              </button>
            </div>
          </form>

          <form className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6" onSubmit={issueStock}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Issue</p>
                <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Issue to flock</h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Flock</span>
                <select className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="flock_id" onChange={updateMovementForm} value={movementForm.flock_id}>
                  {flocks.map((flock) => (
                    <option key={flock.id} value={flock.id}>{flock.name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Feed item</span>
                <select className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="feed_id" onChange={updateMovementForm} value={movementForm.feed_id}>
                  <option value="">Select feed item</option>
                  {items.map((item) => (
                    <option key={`issue-${item.id}`} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Quantity</span>
                <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" min="0" name="quantity" onChange={updateMovementForm} placeholder="40" type="number" value={movementForm.quantity} />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6f7d6f]">Date</span>
                <input className="w-full rounded-xl border border-[#e5e8e0] bg-[#f8faf7] px-3.5 py-2.5 text-[14px] text-[#1f3028] outline-none" name="movement_date" onChange={updateMovementForm} type="date" value={movementForm.movement_date} />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#47584f] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#3d4d43]" type="submit">
                <Truck size={15} />
                Issue stock
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">Inventory list</p>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Feed details</h2>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e7eae2] bg-[#f8faf7] px-2.5 py-2 text-[#4e6453]">
            <Search size={14} />
            <input className="w-[140px] bg-transparent text-[12px] text-[#2a362f] placeholder:text-[#7c867a] outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Search feed" type="search" value={query} />
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-[#f7faf5] px-4 py-5 text-[13px] text-[#5f6d61]">Loading feed inventory…</p>
        ) : filteredItems.length === 0 ? (
          <p className="rounded-xl bg-[#f7faf5] px-4 py-5 text-[13px] text-[#5f6d61]">No feed items added yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredItems.map((item) => {
              const isLow = Number(item.current_stock) < Number(item.minimum_stock)
              return (
                <article className="rounded-2xl border border-[#edf0eb] bg-[#fbfcfa] p-4" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a8a77]">{item.category}</p>
                      <h3 className="mt-1 text-[19px] font-bold tracking-[-0.4px] text-[#2a352f]">{item.name}</h3>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${isLow ? 'bg-[#fbe9e6] text-[#a96456]' : 'bg-[#edf3e5] text-[#53804d]'}`}>
                      {isLow ? 'Low stock' : 'Healthy'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#839183]">Stock</p>
                      <p className="mt-1 text-[18px] font-bold text-[#27372e]">{item.current_stock}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#839183]">Min</p>
                      <p className="mt-1 text-[18px] font-bold text-[#27372e]">{item.minimum_stock}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#839183]">Unit</p>
                      <p className="mt-1 text-[18px] font-bold text-[#27372e]">{item.unit}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[12px] text-[#5f6d61]">
                    <span>{item.brand || 'Brand not specified'}</span>
                    <span>{item.supplier || 'Supplier not specified'}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-[#e7eae2] bg-white p-5 shadow-[0_12px_28px_rgba(18,40,31,0.04)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#72826f]">History</p>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.6px] text-[#27382d]">Movement log</h2>
          </div>
        </div>

        {movements.length === 0 ? (
          <p className="rounded-xl bg-[#f7faf5] px-4 py-5 text-[13px] text-[#5f6d61]">No movement history yet.</p>
        ) : (
          <div className="space-y-3">
            {movements.slice(0, 8).map((movement) => (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#edf0eb] bg-[#fbfcfa] p-3 sm:flex-row sm:items-center sm:justify-between" key={movement.id}>
                <div>
                  <p className="text-[13px] font-semibold text-[#2d3931]">{movement.feed_item?.name}</p>
                  <p className="text-[11px] text-[#78877d]">{movement.movement_type} · {movement.flock_name || 'Warehouse'} · {movement.movement_date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-[#2e3d35]">{movement.quantity} kg</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#839183]">{movement.reference || 'No reference'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
