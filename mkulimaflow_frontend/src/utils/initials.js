export default function getInitials(name, fallback = 'MF') {
  const value = String(name || '').trim()

  if (!value) {
    return fallback
  }

  const [first, second] = value.split(/\s+/)

  return (second ? first[0] + second[0] : value.slice(0, 2)).toUpperCase()
}
