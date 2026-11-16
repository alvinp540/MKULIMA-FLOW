import { ShoppingCartPlus, Tractor } from 'lucide-react'

const ROLES = [
  {
    value: 'farmer',
    label: 'Farmer',
    hint: 'Grow and share',
    icon: <Tractor strokeWidth={2.2} />,
    iconClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/25',
  },
  {
    value: 'buyer',
    label: 'Buyer',
    hint: 'Source with care',
    icon: <ShoppingCartPlus strokeWidth={2.2} />,
    iconClass: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/25',
    comingSoon: true,
  },
]

export default function RolePicker({ value, onChange }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-[9px] text-xs font-bold text-[#424a40]">I’m joining as</legend>
      <div className="grid grid-cols-2 gap-[11px] max-[410px]:grid-cols-1">
        {ROLES.map((role) => {
          const selected = value === role.value
          const disabled = role.comingSoon

          return (
            <label
              aria-disabled={disabled || undefined}
              className={`flex min-h-[69px] items-center gap-2.5 rounded-[11px] border px-3 py-3 transition max-lg:gap-[7px] max-lg:px-2 ${
                disabled
                  ? 'cursor-not-allowed border-dashed border-[#e2e5db] bg-[#fafbf7]'
                  : selected
                    ? 'cursor-pointer border-[#4a805c] bg-[#f4f7f0] shadow-[0_0_0_2px_rgba(67,119,82,0.08)]'
                    : 'cursor-pointer border-[#e5e8df] bg-white hover:border-[#b7c8b3]'
              }`}
              key={role.value}
            >
              <input
                checked={selected}
                className="peer sr-only"
                disabled={disabled}
                name="role"
                onChange={() => onChange(role.value)}
                type="radio"
                value={role.value}
              />
              <span
                aria-hidden="true"
                className={`grid size-[34px] shrink-0 place-items-center rounded-[10px] text-[17px] ${role.iconClass} ${disabled ? 'opacity-60' : ''}`}
              >
                {role.icon}
              </span>
              <span className={`grid gap-px ${disabled ? 'opacity-70' : ''}`}>
                <strong className="text-xs text-[#252d25]">{role.label}</strong>
                <small className="text-[10px] text-[#858b7e]">{role.hint}</small>
              </span>
              {disabled ? (
                <span className="ml-auto shrink-0 rounded-full border border-[#e3dcc6] bg-[#f5efdd] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#8c7441]">
                  Coming soon
                </span>
              ) : (
                <span
                  className={`ml-auto size-[14px] shrink-0 rounded-full ${selected ? 'border-[4px] border-[#346d4b] bg-white' : 'border border-[#cbd2c7]'}`}
                />
              )}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-[10px] leading-[1.6] text-[#858b7e]">
        Buyer accounts are coming soon. Create a farmer account today.
      </p>
    </fieldset>
  )
}
