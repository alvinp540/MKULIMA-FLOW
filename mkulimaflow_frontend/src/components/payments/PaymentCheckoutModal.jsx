import { useEffect, useState } from 'react'
import {
  CircleCheckBig,
  CircleX,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react'
import {
  FALLBACK_PAYMENT_METHODS,
  formatKes,
  formatUsd,
  getMpesaPaymentStatus,
  getOnlinePaymentStatus,
  initiateMpesaPayment,
  initiateOnlinePayment,
} from '../../services/paymentService'

const METHOD_ICONS = {
  mpesa: Smartphone,
  visa: CreditCard,
  paypal: Wallet,
}

const inputClass =
  'mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-white/30 focus:border-[#b8d28e]/60 focus:bg-white/[0.09]'

function isValidPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  return /^(?:254|0)?(?:7\d{8}|1\d{8})$/.test(digits)
}

function isValidEmail(raw) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(raw || '').trim())
}

export default function PaymentCheckoutModal({
  config,
  initialPlan,
  onClose,
  open,
  plans,
}) {
  const methods = config?.methods?.length ? config.methods : FALLBACK_PAYMENT_METHODS

  const [selectedPlan, setSelectedPlan] = useState(initialPlan)
  const [method, setMethod] = useState('mpesa')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [phase, setPhase] = useState('form')
  const [error, setError] = useState('')
  const [payment, setPayment] = useState(null)

  const preferredMethod = methods.find((item) => item.enabled) || methods[0]
  const activeMethodKey = methods.some(
    (item) => item.key === method && item.enabled,
  )
    ? method
    : preferredMethod?.key
  const methodConfig =
    methods.find((item) => item.key === activeMethodKey) || methods[0]
  const activePlan =
    plans.find((plan) => plan.key === selectedPlan) || plans[0] || null
  const isMpesa = activeMethodKey === 'mpesa'
  const enabled = methodConfig?.enabled !== false

  const paidProvider = payment?.provider || activeMethodKey
  const paidIsMpesa = paidProvider === 'mpesa'
  const paidMethodConfig =
    methods.find((item) => item.key === paidProvider) || methodConfig
  const paidAmount = paidIsMpesa
    ? formatKes(payment?.amount_kes ?? activePlan?.amount_kes)
    : formatUsd(payment?.amount_usd ?? activePlan?.amount_usd)
  const formAmount = isMpesa
    ? formatKes(activePlan?.amount_kes)
    : formatUsd(activePlan?.amount_usd)
  const demo = Boolean(payment?.demo || methodConfig?.demo_mode)
  const ActiveIcon = METHOD_ICONS[paidProvider] || CreditCard

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && phase !== 'pending') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, phase, onClose])

  useEffect(() => {
    if (!open || phase !== 'pending' || !payment?.reference) return undefined

    const deadline = Date.now() + 120000
    const reference = payment.reference
    const provider = payment.provider || 'mpesa'
    const loadStatus =
      provider === 'mpesa' ? getMpesaPaymentStatus : getOnlinePaymentStatus

    async function poll() {
      try {
        const result = await loadStatus(reference)
        setPayment(result)

        if (result.status === 'success') {
          clearInterval(interval)
          setPhase('success')
          return
        }
        if (result.status === 'failed' || result.status === 'cancelled') {
          clearInterval(interval)
          setError(result.result_desc || 'The payment did not go through.')
          setPhase('failed')
          return
        }
      } catch {
        // Keep polling briefly; transient network errors are common on mobile.
      }

      if (Date.now() >= deadline) {
        clearInterval(interval)
        setError(
          provider === 'mpesa'
            ? 'We have not received M-Pesa confirmation yet. If you approved the prompt, check your M-Pesa messages before trying again.'
            : 'We have not received payment confirmation yet. Please check your payment provider before trying again.',
        )
        setPhase('failed')
      }
    }

    const interval = setInterval(poll, 3000)
    return () => {
      clearInterval(interval)
    }
  }, [open, phase, payment?.reference, payment?.provider])

  if (!open) return null

  async function handleSubmit(event) {
    event.preventDefault()
    if (!activePlan || !enabled) return

    if (isMpesa) {
      if (!isValidPhone(phone)) {
        setError('Enter a valid Safaricom number, e.g. 0712 345 678.')
        return
      }
    } else {
      if (!isValidEmail(email)) {
        setError('Enter a valid email address for your receipt.')
        return
      }
      if (activeMethodKey === 'visa' && cardholderName.trim().length < 2) {
        setError('Enter the cardholder name.')
        return
      }
    }

    setError('')
    setPhase('pending')
    setPayment(null)

    try {
      const result = isMpesa
        ? await initiateMpesaPayment({
            plan: activePlan.key,
            phoneNumber: phone,
          })
        : await initiateOnlinePayment({
            provider: activeMethodKey,
            plan: activePlan.key,
            email,
            cardholderName,
          })
      setPayment(result)

      if (result.status === 'success') {
        setPhase('success')
      } else if (result.status === 'failed' || result.status === 'cancelled') {
        setError(result.result_desc || 'The payment did not go through.')
        setPhase('failed')
      }
    } catch (requestError) {
      setError(requestError.message)
      setPhase('failed')
    }
  }

  function resetForm() {
    setPhase('form')
    setError('')
    setPayment(null)
  }

  const success = phase === 'success'
  const failed = phase === 'failed'
  const pending = phase === 'pending'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#04120c]/75 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
      role="presentation"
    >
      <div
        aria-labelledby="payment-checkout-title"
        aria-modal="true"
        className="relative w-full max-w-[470px] overflow-hidden rounded-[26px] border border-white/12 bg-[linear-gradient(165deg,rgba(18,47,33,0.99),rgba(6,20,14,0.99))] text-white shadow-[0_30px_80px_rgba(2,12,8,0.65)]"
        role="dialog"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[#b8d28e]/12 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[1.8px] text-[#b8d28e]">
              <ActiveIcon aria-hidden="true" size={13} />
              {paidMethodConfig?.label || 'Secure'} checkout
            </p>
            <h2 className="mt-1.5 font-display text-[21px] font-semibold tracking-[-0.5px]" id="payment-checkout-title">
              {success
                ? 'Payment received'
                : failed
                  ? 'Payment not completed'
                  : pending
                    ? (paidIsMpesa ? 'Check your phone' : 'Confirming payment')
                    : `Pay with ${methodConfig?.label || 'M-Pesa'}`}
            </h2>
          </div>
          <button
            aria-label="Close checkout"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={15} />
          </button>
        </div>

        <div className="relative px-6 py-5">
          {success ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#b8d28e]/30 bg-[#b8d28e]/15 text-[#c8e0a1]">
                <CircleCheckBig aria-hidden="true" size={28} strokeWidth={1.8} />
              </span>
              <p className="mt-4 text-[13px] leading-[1.7] text-white/70">
                {demo
                  ? 'Demo payment recorded. No money was moved.'
                  : `Your ${paidMethodConfig?.label || 'payment'} payment has been confirmed.`}
              </p>

              <dl className="mt-5 space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">Plan</dt>
                  <dd className="font-semibold text-white">
                    {activePlan ? `${activePlan.name} · ${activePlan.billing}` : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">Amount</dt>
                  <dd className="font-semibold text-white">{paidAmount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">Method</dt>
                  <dd className="font-semibold text-white">{paidMethodConfig?.label || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">Receipt</dt>
                  <dd className="font-mono text-[11.5px] font-semibold text-[#c8e0a1]">
                    {payment?.receipt || payment?.mpesa_receipt || 'Pending'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{paidIsMpesa ? 'Phone' : 'Email'}</dt>
                  <dd className="max-w-[62%] truncate font-semibold text-white">
                    {paidIsMpesa
                      ? payment?.phone_number || phone
                      : payment?.email || email}
                  </dd>
                </div>
                {!paidIsMpesa && payment?.cardholder_name && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-white/50">Cardholder</dt>
                    <dd className="font-semibold text-white">{payment.cardholder_name}</dd>
                  </div>
                )}
              </dl>

              {demo && (
                <p className="mt-3 rounded-xl border border-[#e8c56a]/25 bg-[#e8c56a]/10 px-3 py-2 text-[10.5px] leading-[1.6] text-[#f0dca4]">
                  Demo mode: no real charge was made. Payment gateway credentials are
                  not configured on this server.
                </p>
              )}

              <button
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] transition hover:bg-[#c9e0a3]"
                onClick={onClose}
                type="button"
              >
                Done
              </button>
            </div>
          ) : failed ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#f0a5a5]/30 bg-[#f0a5a5]/12 text-[#f3b8b8]">
                <CircleX aria-hidden="true" size={28} strokeWidth={1.8} />
              </span>
              <p className="mt-4 text-[12.5px] leading-[1.7] text-white/70">
                {error || 'The payment did not go through.'}
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] transition hover:bg-[#c9e0a3]"
                  onClick={resetForm}
                  type="button"
                >
                  Try again
                </button>
                <button
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-5 text-[12.5px] font-semibold text-white/80 transition hover:bg-white/[0.12] hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          ) : pending ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full border border-[#b8d28e]/25 bg-[#b8d28e]/12 text-[#c8e0a1]">
                <LoaderCircle aria-hidden="true" className="animate-spin" size={26} strokeWidth={1.9} />
              </span>
              <p className="mt-4 text-[13px] font-semibold text-white">
                {paidIsMpesa ? 'Check your phone' : `Confirming your ${paidMethodConfig?.label} payment`}
              </p>
              {paidIsMpesa ? (
                <p className="mt-1.5 text-[12px] leading-[1.7] text-white/60">
                  An M-Pesa prompt was sent to{' '}
                  <span className="font-semibold text-white">{payment?.phone_number || phone}</span>.
                  Enter your PIN to approve{' '}
                  <span className="font-semibold text-white">{paidAmount}</span>.
                </p>
              ) : (
                <p className="mt-1.5 text-[12px] leading-[1.7] text-white/60">
                  We are confirming your {paidMethodConfig?.label} payment of{' '}
                  <span className="font-semibold text-white">{paidAmount}</span>. Keep
                  this window open.
                </p>
              )}
              <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10.5px] leading-[1.6] text-white/45">
                This window updates automatically once the payment is confirmed.
              </p>
              <button
                className="mt-5 inline-flex min-h-[40px] w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.12] hover:text-white"
                onClick={onClose}
                type="button"
              >
                Close without waiting
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-[10px] font-bold uppercase tracking-[1.4px] text-white/40">
                Payment method
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">
                {methods.map((item) => {
                  const Icon = METHOD_ICONS[item.key] || CreditCard
                  const active = item.key === activeMethodKey
                  return (
                    <button
                      aria-pressed={active}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                        active
                          ? 'bg-[#b8d28e] text-[#173325]'
                          : 'text-white/60 hover:bg-white/[0.08] hover:text-white'
                      } ${item.enabled ? '' : 'cursor-not-allowed opacity-40'}`}
                      disabled={!item.enabled}
                      key={item.key}
                      onClick={() => {
                        setMethod(item.key)
                        setError('')
                      }}
                      type="button"
                    >
                      <Icon aria-hidden="true" size={13} />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-[1.4px] text-white/40">
                Choose a plan
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {plans.map((plan) => {
                  const active = plan.key === selectedPlan
                  return (
                    <button
                      className={`rounded-2xl border px-3.5 py-3 text-left transition ${
                        active
                          ? 'border-[#b8d28e]/50 bg-[#b8d28e]/12'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]'
                      }`}
                      key={plan.key}
                      onClick={() => {
                        setSelectedPlan(plan.key)
                        setError('')
                      }}
                      type="button"
                    >
                      <span className="block text-[11.5px] font-semibold text-white">
                        {plan.name} · {plan.billing === 'yearly' ? 'Yearly' : 'Monthly'}
                      </span>
                      <span className={`mt-0.5 block text-[14px] font-bold ${active ? 'text-[#d7e9b8]' : 'text-white/80'}`}>
                        {formatKes(plan.amount_kes)}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-white/45">
                        ${plan.amount_usd} {plan.period}
                      </span>
                    </button>
                  )
                })}
              </div>

              {isMpesa ? (
                <>
                  <label className="mt-4 block text-[10px] font-bold uppercase tracking-[1.4px] text-white/40" htmlFor="payment-phone">
                    Safaricom number
                  </label>
                  <input
                    autoComplete="tel"
                    className={inputClass}
                    id="payment-phone"
                    inputMode="tel"
                    onChange={(event) => {
                      setPhone(event.target.value)
                      setError('')
                    }}
                    placeholder="0712 345 678"
                    type="tel"
                    value={phone}
                  />
                </>
              ) : (
                <>
                  {activeMethodKey === 'visa' && (
                    <>
                      <label className="mt-4 block text-[10px] font-bold uppercase tracking-[1.4px] text-white/40" htmlFor="payment-cardholder">
                        Cardholder name
                      </label>
                      <input
                        autoComplete="cc-name"
                        className={inputClass}
                        id="payment-cardholder"
                        onChange={(event) => {
                          setCardholderName(event.target.value)
                          setError('')
                        }}
                        placeholder="As shown on the card"
                        type="text"
                        value={cardholderName}
                      />
                    </>
                  )}
                  <label className="mt-4 block text-[10px] font-bold uppercase tracking-[1.4px] text-white/40" htmlFor="payment-email">
                    Email for receipt
                  </label>
                  <input
                    autoComplete="email"
                    className={inputClass}
                    id="payment-email"
                    inputMode="email"
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError('')
                    }}
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                  />
                </>
              )}

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[1.2px] text-white/40">Total</p>
                  <p className="mt-0.5 font-display text-[22px] font-semibold tracking-[-0.6px] text-white">
                    {formAmount}
                  </p>
                </div>
                <div className="text-right">
                  {isMpesa ? (
                    <>
                      <p className="text-[10.5px] text-white/45">≈ ${activePlan?.amount_usd}</p>
                      <p className="text-[10px] text-white/35">
                        {config?.usd_to_kes_rate
                          ? `at KES ${config.usd_to_kes_rate}/USD`
                          : 'KES conversion'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10.5px] text-white/45">
                        {activePlan?.billing === 'yearly' ? 'one-off payment' : 'billed monthly'}
                      </p>
                      <p className="text-[10px] text-white/35">charged in USD</p>
                    </>
                  )}
                </div>
              </div>

              {!enabled && (
                <p className="mt-3 rounded-xl border border-[#e8c56a]/25 bg-[#e8c56a]/10 px-3 py-2 text-[10.5px] leading-[1.6] text-[#f0dca4]">
                  {methodConfig?.message || 'This payment method is not available yet.'}
                </p>
              )}

              {enabled && demo && (
                <p className="mt-3 rounded-xl border border-[#e8c56a]/25 bg-[#e8c56a]/10 px-3 py-2 text-[10.5px] leading-[1.6] text-[#f0dca4]">
                  {methodConfig?.message || 'Demo mode: no real charge will be made.'}
                </p>
              )}

              {enabled && !demo && (
                <p className="mt-3 inline-flex items-start gap-2 text-[10.5px] leading-[1.6] text-white/45">
                  <ShieldCheck aria-hidden="true" className="mt-[1px] shrink-0 text-[#b8d28e]" size={13} />
                  {isMpesa
                    ? 'Safaricom will send an STK Push prompt to this number. Enter your M-Pesa PIN to complete the payment.'
                    : activeMethodKey === 'visa'
                      ? 'You will be redirected to a secure card checkout to complete this payment.'
                      : 'You will be redirected to PayPal to approve this payment.'}
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-[#f0a5a5]/30 bg-[#f0a5a5]/10 px-3 py-2 text-[11px] leading-[1.6] text-[#f3b8b8]" role="alert">
                  {error}
                </p>
              )}

              <button
                className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] transition hover:bg-[#c9e0a3] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!enabled || !activePlan}
                type="submit"
              >
                Pay {formAmount} with {methodConfig?.label || 'M-Pesa'}
              </button>
              <p className="mt-2.5 text-center text-[10px] text-white/35">
                {isMpesa
                  ? 'Payments are processed by Safaricom M-Pesa.'
                  : activeMethodKey === 'visa'
                    ? 'Visa payments are processed by our card provider.'
                    : 'Payments are processed by PayPal.'}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
