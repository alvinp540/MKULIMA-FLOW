export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  autoComplete,
}) {
  return (
    <label className="grid gap-[7px] text-xs font-bold text-[#424a40]" htmlFor={name}>
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        className="h-[45px] w-full rounded-[9px] border border-[#dfe3d9] bg-white px-[13px] text-[13px] font-normal text-[#252d25] outline-none transition placeholder:text-[#a7ada2] focus:border-[#5b8c67] focus:ring-[3px] focus:ring-[#417a50]/[0.12]"
        id={name}
        name={name}
        onChange={onChange}
        required
        type={type}
        value={value}
      />
    </label>
  )
}
