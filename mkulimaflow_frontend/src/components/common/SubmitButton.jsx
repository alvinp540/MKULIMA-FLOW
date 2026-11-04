export default function SubmitButton({ busy, children }) {
  return (
    <button
      className="mt-[3px] inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[10px] bg-[#346d4b] px-[17px] text-[13px] font-bold text-white shadow-[0_7px_16px_rgba(34,88,59,0.13)] transition hover:-translate-y-px hover:bg-[#28583c] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#346d4b]/40 disabled:cursor-wait disabled:opacity-70"
      disabled={busy}
      type="submit"
    >
      {children}
      {!busy && <span className="ml-auto text-[19px] font-normal" aria-hidden="true">→</span>}
    </button>
  )
}
