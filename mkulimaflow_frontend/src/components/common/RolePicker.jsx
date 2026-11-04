import { ShoppingCartPlus ,Tractor} from 'lucide-react'
export default function RolePicker({ value, onChange }) {
  const roles = [
    {
      value: 'farmer',
      label: 'Farmer',
      hint: 'Grow and share',
      icon: <Tractor />,
      iconClass: 'bg-[#e8f0df] text-[#48734d]',
    },
    {
      value: 'buyer',
      label: 'Buyer',
      hint: 'Source with care',
      icon: <ShoppingCartPlus />,
      iconClass: 'bg-[#f2ecdc] text-[#8c7441]',
    },
  ]

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-[9px] text-xs font-bold text-[#424a40]">I’m joining as</legend>
      <div className="grid grid-cols-2 gap-[11px] max-[410px]:grid-cols-1">
        {roles.map((role) => (
          <label
            className={`flex min-h-[69px] cursor-pointer items-center gap-2.5 rounded-[11px] border px-3 py-3 transition max-lg:gap-[7px] max-lg:px-2 ${value === role.value ? 'border-[#4a805c] bg-[#f4f7f0] shadow-[0_0_0_2px_rgba(67,119,82,0.08)]' : 'border-[#e5e8df] bg-white hover:border-[#b7c8b3]'}`}
            key={role.value}
          >
            <input
              checked={value === role.value}
              className="peer sr-only"
              name="role"
              onChange={() => onChange(role.value)}
              type="radio"
              value={role.value}
            />
            <span className={`grid size-[34px] shrink-0 place-items-center rounded-[10px] text-[17px] ${role.iconClass}`} aria-hidden="true">
              {role.icon}
            </span>
            <span className="grid gap-px">
              <strong className="text-xs text-[#252d25]">{role.label}</strong>
              <small className="text-[10px] text-[#858b7e]">{role.hint}</small>
            </span>
            <span className={`ml-auto size-[14px] shrink-0 rounded-full ${value === role.value ? 'border-[4px] border-[#346d4b] bg-white' : 'border border-[#cbd2c7]'}`} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
