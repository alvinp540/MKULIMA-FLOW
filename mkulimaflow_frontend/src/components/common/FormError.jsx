export default function FormError({ children }) {
  if (!children) return null

  return (
    <p className="rounded-lg border border-[#ebc8b8] bg-[#fff6f1] px-3 py-[11px] text-xs leading-relaxed text-[#934621]" role="alert">
      {children}
    </p>
  )
}
