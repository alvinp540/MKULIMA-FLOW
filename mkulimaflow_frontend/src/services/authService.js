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

export async function authRequest(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' }

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-CSRFToken'] = await getCsrfToken()

  let response

  try {
    response = await fetch(`${AUTH_API}/${path}/`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Unable to reach the server. Check that the backend is running.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) throw new Error(formatError(data))
  return data
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
