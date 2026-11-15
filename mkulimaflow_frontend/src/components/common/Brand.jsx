import { Link } from 'react-router-dom'

export default function Brand({ compact = false, light = false, to = '/' }) {
  return (
    <Link to={to} className="flex min-w-0 shrink-0 items-center gap-2">
  <img
    src="/images/mkulimaflow-logo.png"
    alt="MkulimaFlow - Grow together"
    className="h-14 w-auto object-contain max-sm:h-11"
  />
  <span className={(compact ? 'hidden sm:inline ' : '') + (light ? 'text-white' : '')}>
    Mkulima<span className={light ? 'text-[#b8d28e]' : 'text-[#346d4b]'}>Flow</span>
  </span>
</Link>
  )
}
