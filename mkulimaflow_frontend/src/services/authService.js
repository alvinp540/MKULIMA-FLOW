const AUTH_API = '/api/auth'
let csrfToken = ''

async function getCsrfToken() {
  if (csrfToken) return csrfToken

  const response = await fetch(`${AUTH_API}/csrf/`, {
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
    const response = await fetch(url, {
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
