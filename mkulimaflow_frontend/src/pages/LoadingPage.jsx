export default function LoadingPage() {
  return (
    <div className="flex min-h-[calc(100vh-152px)] items-center justify-center gap-3 text-[13px] text-[#7d8479]" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-[#dce5d8] border-t-[#346d4b]" />
      <span>Connecting to MkulimaFlow…</span>
    </div>
  )
}
