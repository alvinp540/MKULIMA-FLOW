const AUTH_API = '/api/auth'

// In production Vite inlines VITE_API_BASE_URL at build time. Leaving it
// empty preserves the local dev behaviour, where Vite proxies /api to Django.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function withApiBase(url) {
  if (!API_BASE || /^https?:\/\//i.test(url) || url.startsWith(API_BASE)) return url
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}

let csrfToken = ''

async function getCsrfToken() {
  if (csrfToken) return csrfToken

  const response = await fetch(withApiBase(`${AUTH_API}/csrf/`), {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Could not start a secure session. Please try again.')
  }

  const data = await response.json()
  csrfToken = data.csrfToken
  return csrfToken
}

export async function csrfFetch(url, { method = 'GET', body, headers = {}, credentials = 'include' } = {}) {
  const requestHeaders = { Accept: 'application/json', ...headers }

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (method !== 'GET' && method !== 'HEAD') {
    requestHeaders['X-CSRFToken'] = await getCsrfToken()
  }

  try {
    const response = await fetch(withApiBase(url), {
      method,
      credentials,
      headers: requestHeaders,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })

    if (response.status === 204) return null

    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(formatError(data))
    return data
  } catch (error) {
    if (error instanceof Error && error.message) throw error
    throw new Error('Unable to reach the server. Check that the backend is running.')
  }
}

export async function authRequest(path, { method = 'GET', body } = {}) {
  return csrfFetch(`${AUTH_API}/${path}/`, { method, body })
}

function formatError(data) {
  if (data.error) return data.error

  if (data.errors) {
    return Object.entries(data.errors)
      .map(([field, errors]) => {
        const messages = errors.map((error) => error.message).join(' ')
        return field === '__all__' ? messages : `${field}: ${messages}`
      })
      .join(' ')
  }

  return 'Something went wrong. Please try again.'
}

export function resetCsrfToken() {
  csrfToken = ''
}
