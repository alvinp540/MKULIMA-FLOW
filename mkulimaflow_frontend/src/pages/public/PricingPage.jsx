import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgePercent,
  CalendarCheck,
  Check,
  Crown,
  Feather,
  RefreshCw,
  Smartphone,
  Sparkles,
  Sprout,
} from 'lucide-react'
import PaymentCheckoutModal from '../../components/payments/PaymentCheckoutModal'
import SiteFooter from '../../components/common/SiteFooter'
import {
  FALLBACK_PAYMENT_PLANS,
  FALLBACK_PAYMENT_METHODS,
  formatKes,
  getPaymentConfig,
} from '../../services/paymentService'

const PLANS = [
  {
    name: 'Free Trial',
    icon: Sprout,
    price: '$0',
    period: 'for 30 days',
    tagline: 'Try the full workspace free for one month.',
    badge: 'No card required',
    features: [
      'Full access to every module',
      'Up to 2 flocks',
      'Daily egg, feed & health records',
      'Email support',
    ],
    cta: 'Start free trial',
    note: 'No payment details needed.',
    payPlan: null,
  },
  {
    name: 'Simple',
    icon: Feather,
    price: '$20',
    period: 'per month',
    tagline: 'Everyday tracking for a small poultry farm.',
    features: [
      'Everything in Free Trial',
      'Up to 5 flocks',
      'Production trends & low-stock alerts',
      'Monthly farm summary',
      'Email support',
    ],
    cta: 'Choose Simple',
    note: 'Billed monthly. Cancel anytime.',
    payPlan: 'simple-monthly',
  },
  {
    name: 'Pro',
    icon: Crown,
    price: '$30',
    period: 'per month',
    tagline: 'More flocks, deeper reports, priority help.',
    badge: 'Most popular',
    features: [
      'Everything in Simple',
      'Unlimited flocks & farms',
      'Health reports & mortality insights',
      'Data export',
      'Priority support',
    ],
    cta: 'Choose Pro',
    note: 'Billed monthly. Cancel anytime.',
    payPlan: 'pro-monthly',
    featured: true,
  },
  {
    name: 'Yearly',
    icon: BadgePercent,
    price: '$168',
    period: 'per year',
    subline: 'Simple yearly · Pro yearly is $252',
    tagline: 'Pay once for 12 months and save 30%.',
    badge: 'Save 30%',
    features: [
      '30% off the monthly price',
      'Simple yearly: $168 (save $72)',
      'Pro yearly: $252 (save $108)',
      'One-off payment, no monthly renewals',
      'Priority onboarding',
    ],
    cta: 'Pay yearly',
    note: 'One payment covers 12 months.',
    payPlan: 'simple-yearly',
    annual: true,
  },
]

const FAQS = [
  {
    question: 'How does the free month work?',
    answer: 'You get full access to every module for 30 days, with no card required. Choose a paid plan whenever you are ready — your records stay exactly where they are.',
  },
  {
    question: 'How do I pay?',
    answer: 'Choose a paid plan and pick M-Pesa, Visa, or PayPal at checkout. With M-Pesa you approve an STK Push prompt on your phone; with Visa or PayPal you confirm the payment in USD and get a receipt by email.',
  },
  {
    question: 'How does yearly billing work?',
    answer: 'Pay once for 12 months and get 30% off the monthly price. Simple works out to $168 per year and Pro to $252 per year, instead of $240 and $360. Pay in Kenyan shillings with M-Pesa or in USD with Visa or PayPal.',
  },
  {
    question: 'Can I switch or cancel later?',
    answer: 'Yes. Move between Simple and Pro, or between monthly and yearly billing, at any time. If you cancel, you keep access until the end of the period you paid for.',
  },
  {
    question: 'Are there any hidden fees?',
    answer: 'No. Prices are set in USD. M-Pesa payments are converted to Kenyan shillings at checkout, and the exact KES amount is always shown before you approve the STK Push prompt.',
  },
]

const GUARANTEES = [
  {
    icon: Smartphone,
    title: 'M-Pesa, Visa & PayPal',
    detail: 'Pay in KES or USD, whichever suits you.',
  },
  { icon: RefreshCw, title: 'Switch anytime', detail: 'Change plans or billing as you grow.' },
  { icon: CalendarCheck, title: '30-day trial', detail: 'Try everything before you pay.' },
]

const eyebrowClass = 'text-[10px] font-extrabold uppercase tracking-[2px] text-[#b8d28e]'

function planCtaClass(featured, annual) {
  return `mt-6 inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[12.5px] font-bold no-underline transition hover:-translate-y-0.5 ${
    featured
      ? 'bg-[#b8d28e] text-[#173325] shadow-[0_10px_26px_rgba(9,28,19,0.3)] hover:bg-[#c9e0a3]'
      : annual
        ? 'bg-[#d8c77a] text-[#2c2410] hover:bg-[#e6d792]'
        : 'border border-white/20 bg-white/[0.06] text-white/85 backdrop-blur-md hover:border-white/35 hover:bg-white/[0.11] hover:text-white'
  }`
}

export default function PricingPage() {
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [checkoutPlan, setCheckoutPlan] = useState(null)

  useEffect(() => {
    let active = true

    getPaymentConfig()
      .then((data) => {
        if (active) setPaymentConfig(data)
      })
      .catch(() => {
        if (active) setPaymentConfig(null)
      })

    return () => {
      active = false
    }
  }, [])

  const paymentPlans = paymentConfig?.plans?.length
    ? paymentConfig.plans
    : FALLBACK_PAYMENT_PLANS
  const paymentMethods = paymentConfig?.methods?.length
    ? paymentConfig.methods
    : FALLBACK_PAYMENT_METHODS
  const plansByKey = Object.fromEntries(paymentPlans.map((plan) => [plan.key, plan]))

  return (
    <>
      <main className="relative z-10 flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-[#b8d28e]/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 size-[340px] rounded-full bg-[#2f7a4e]/25 blur-3xl" />

          <div className="relative mx-auto w-[min(1200px,calc(100%-64px))] py-14 max-sm:w-[calc(100%-36px)] lg:py-20">
            <div className="max-w-[720px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[1.6px] text-white/70 backdrop-blur-md">
                <Sparkles aria-hidden="true" className="text-[#b8d28e]" size={13} />
                Plans & pricing
              </span>

              <h1 className="mt-5 font-display text-[clamp(36px,5vw,56px)] font-semibold leading-[1.05] tracking-[-1.6px] text-white">
                A plan for every
                {' '}
                <span className="text-[#c8e0a1]">stage of your farm.</span>
              </h1>

              <p className="mt-5 max-w-[600px] text-[14px] leading-[1.8] text-white/70">
                Start with a free month. Keep your everyday records on Simple, unlock
                deeper reports with Pro, or pay once for the year and save 30%.
              </p>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-white/55">
                {['30-day free trial', 'Cancel anytime', 'M-Pesa, Visa & PayPal'].map((item) => (
                  <li className="inline-flex items-center gap-1.5" key={item}>
                    <Check aria-hidden="true" className="text-[#b8d28e]" size={13} strokeWidth={2.6} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-label="Pricing plans" className="mx-auto w-[min(1200px,calc(100%-64px))] pb-12 max-sm:w-[calc(100%-36px)]">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map(({ name, icon: Icon, price, period, subline, tagline, badge, features, cta, note, featured, annual, payPlan }) => (
              <article
                className={`relative flex flex-col rounded-[24px] border p-6 backdrop-blur-md transition duration-200 hover:-translate-y-1 ${
                  featured
                    ? 'border-[#b8d28e]/45 bg-[linear-gradient(160deg,rgba(184,210,142,0.16),rgba(255,255,255,0.05))] shadow-[0_24px_60px_rgba(4,18,12,0.45)]'
                    : annual
                      ? 'border-[#d8c77a]/35 bg-[linear-gradient(160deg,rgba(216,199,122,0.12),rgba(255,255,255,0.045))] hover:border-[#d8c77a]/55'
                      : 'border-white/12 bg-white/[0.05] hover:border-[#b8d28e]/30 hover:bg-white/[0.075]'
                }`}
                key={name}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid size-10 place-items-center rounded-xl border ${
                      annual
                        ? 'border-[#d8c77a]/25 bg-[#d8c77a]/15 text-[#e8dca6]'
                        : 'border-white/10 bg-[#b8d28e]/10 text-[#c6dfa0]'
                    }`}
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.9} />
                  </span>
                  {badge && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                        annual
                          ? 'border border-[#d8c77a]/30 bg-[#d8c77a]/15 text-[#e8dca6]'
                          : featured
                            ? 'bg-[#b8d28e] text-[#173325]'
                            : 'border border-white/15 bg-white/[0.06] text-white/65'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>

                <h2 className="mt-5 font-display text-[19px] font-semibold tracking-[-0.4px] text-white">{name}</h2>
                <p className="mt-1.5 min-h-[36px] text-[12px] leading-[1.6] text-white/55">{tagline}</p>

                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`font-display text-[34px] font-semibold tracking-[-1.2px] ${annual ? 'text-[#e8dca6]' : 'text-white'}`}>
                      {price}
                    </span>
                    <span className="text-[11px] font-medium text-white/50">{period}</span>
                  </div>
                  {payPlan && plansByKey[payPlan] && (
                    <p className="mt-1 text-[10.5px] font-medium text-white/45">
                      ≈ {formatKes(plansByKey[payPlan].amount_kes)} via M-Pesa
                    </p>
                  )}
                  {subline && <p className="mt-1.5 text-[10.5px] text-white/45">{subline}</p>}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {features.map((feature) => (
                    <li className="flex items-start gap-2 text-[11.5px] leading-[1.55] text-white/60" key={feature}>
                      <Check
                        aria-hidden="true"
                        className={`mt-[1px] shrink-0 ${annual ? 'text-[#d8c77a]' : 'text-[#b8d28e]'}`}
                        size={12}
                        strokeWidth={2.6}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {payPlan ? (
                  <button
                    className={planCtaClass(featured, annual)}
                    onClick={() => setCheckoutPlan(payPlan)}
                    type="button"
                  >
                    {cta}
                    <ArrowRight aria-hidden="true" size={13} />
                  </button>
                ) : (
                  <Link className={planCtaClass(featured, annual)} to="/signup">
                    {cta}
                    <ArrowRight aria-hidden="true" size={13} />
                  </Link>
                )}
                <p className="mt-2.5 text-center text-[10px] text-white/40">{note}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-semibold text-white">Choose how you pay</p>
                {paymentConfig?.demo_mode && (
                  <span className="rounded-full border border-[#e8c56a]/30 bg-[#e8c56a]/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#f0dca4]">
                    Demo mode
                  </span>
                )}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <li
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-semibold ${
                      method.enabled
                        ? 'border-[#b8d28e]/30 bg-[#b8d28e]/10 text-[#d7e9b8]'
                        : 'border-white/10 bg-white/[0.03] text-white/35'
                    }`}
                    key={method.key}
                  >
                    <Check aria-hidden="true" size={11} strokeWidth={2.6} />
                    {method.label}
                    <span className="font-medium text-white/40">{method.currency}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11px] leading-[1.6] text-white/50">
                Pay in Kenyan shillings with M-Pesa, or in USD with Visa or PayPal.
                {paymentConfig?.demo_mode &&
                  ' Demo mode is on: no real money will be charged until gateway credentials are configured.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-md">
              <p className="text-[11.5px] leading-[1.7] text-white/55">
                <span className="font-semibold text-[#c8e0a1]">Yearly billing:</span>
                {' '}
                pay once for 12 months and save 30% on either paid plan — Simple
                $168/year, Pro $252/year. Monthly plans stay flexible and can be
                cancelled anytime.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Why pay with confidence" className="mx-auto w-[min(1200px,calc(100%-64px))] pb-12 max-sm:w-[calc(100%-36px)]">
          <div className="grid gap-4 sm:grid-cols-3">
            {GUARANTEES.map(({ icon: Icon, title, detail }) => (
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md" key={title}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#b8d28e]/10 text-[#c6dfa0]">
                  <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-[1.6] text-white/50">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] pb-16 max-sm:w-[calc(100%-36px)]">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md sm:p-8">
            <div className="max-w-[560px]">
              <p className={eyebrowClass}>Good to know</p>
              <h2 className="mt-3 font-display text-[clamp(24px,2.8vw,32px)] font-semibold leading-[1.15] tracking-[-0.9px] text-white">
                Pricing questions, answered.
              </h2>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {FAQS.map(({ question, answer }) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5" key={question}>
                  <h3 className="text-[13px] font-semibold text-white">{question}</h3>
                  <p className="mt-1.5 text-[11.5px] leading-[1.7] text-white/55">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-[min(1200px,calc(100%-64px))] pb-16 max-sm:w-[calc(100%-36px)]">
          <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[linear-gradient(120deg,rgba(30,86,52,0.85),rgba(11,32,23,0.92))] p-7 shadow-[0_24px_60px_rgba(4,18,12,0.35)] backdrop-blur-xl sm:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#b8d28e]/15 blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-[clamp(24px,3vw,34px)] font-semibold leading-[1.15] tracking-[-1px] text-white">
                  Start with a free month.
                </h2>
                <p className="mt-2 max-w-[520px] text-[13px] leading-[1.7] text-white/65">
                  No card required. Set up your farm, add your flocks, and see how the
                  workspace fits before choosing a plan.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#b8d28e] px-5 text-[12.5px] font-bold text-[#173325] no-underline transition hover:-translate-y-0.5 hover:bg-[#c9e0a3]"
                  to="/signup"
                >
                  Start free trial
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
                <Link
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-[12.5px] font-semibold text-white/85 no-underline transition hover:border-white/35 hover:bg-white/[0.11] hover:text-white"
                  to="/login"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PaymentCheckoutModal
        config={paymentConfig}
        initialPlan={checkoutPlan}
        key={checkoutPlan ?? 'closed'}
        onClose={() => setCheckoutPlan(null)}
        open={Boolean(checkoutPlan)}
        plans={paymentPlans}
      />

      <SiteFooter />
    </>
  )
}
