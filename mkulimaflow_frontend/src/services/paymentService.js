import { csrfFetch } from './authService'

const PAYMENTS_API = '/api/payments'

export const FALLBACK_PAYMENT_PLANS = [
  {
    key: 'simple-monthly',
    name: 'Simple',
    billing: 'monthly',
    period: 'per month',
    amount_usd: '20.00',
    amount_kes: 2600,
  },
  {
    key: 'pro-monthly',
    name: 'Pro',
    billing: 'monthly',
    period: 'per month',
    amount_usd: '30.00',
    amount_kes: 3900,
  },
  {
    key: 'simple-yearly',
    name: 'Simple',
    billing: 'yearly',
    period: 'per year',
    amount_usd: '168.00',
    amount_kes: 21840,
  },
  {
    key: 'pro-yearly',
    name: 'Pro',
    billing: 'yearly',
    period: 'per year',
    amount_usd: '252.00',
    amount_kes: 32760,
  },
]

export const FALLBACK_PAYMENT_METHODS = [
  {
    key: 'mpesa',
    label: 'M-Pesa',
    currency: 'KES',
    enabled: true,
    demo_mode: true,
    message: 'Demo mode: no real M-Pesa charge will be made.',
  },
  {
    key: 'visa',
    label: 'Visa',
    currency: 'USD',
    enabled: true,
    demo_mode: true,
    message: 'Demo mode: no real Visa charge will be made.',
  },
  {
    key: 'paypal',
    label: 'PayPal',
    currency: 'USD',
    enabled: true,
    demo_mode: true,
    message: 'Demo mode: no real PayPal charge will be made.',
  },
]

export function getPaymentConfig() {
  return csrfFetch(`${PAYMENTS_API}/config/`)
}

export function getMpesaConfig() {
  return csrfFetch(`${PAYMENTS_API}/mpesa/config/`)
}

export function initiateMpesaPayment({ plan, phoneNumber }) {
  return csrfFetch(`${PAYMENTS_API}/mpesa/initiate/`, {
    method: 'POST',
    body: { plan, phone_number: phoneNumber },
  })
}

export function getMpesaPaymentStatus(reference) {
  return csrfFetch(`${PAYMENTS_API}/mpesa/status/${reference}/`)
}

export function initiateOnlinePayment({ provider, plan, email, cardholderName }) {
  return csrfFetch(`${PAYMENTS_API}/online/initiate/`, {
    method: 'POST',
    body: {
      provider,
      plan,
      email,
      cardholder_name: cardholderName,
    },
  })
}

export function getOnlinePaymentStatus(reference) {
  return csrfFetch(`${PAYMENTS_API}/online/status/${reference}/`)
}

export function formatKes(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}
