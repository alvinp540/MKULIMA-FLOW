import { Link } from 'react-router-dom'

export default function Brand({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2">
  <img
    src="/images/mkulimaflow-logo.png"
    alt="MkulimaFlow - Grow together"
    className="h-14 w-auto object-contain"
  />
  <span>Mkulima<span className="text-[#346d4b]">Flow</span></span>
</Link>
  )
}
