import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export function Switch({
  label,
  checked,
  onCheckedChange,
  disabled,
  className
}: {
  label: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <label className={cn('flex items-center justify-between py-1.5 text-[13px] select-none', disabled ? 'text-dim' : 'cursor-pointer', className)}>
      <span>{label}</span>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative h-[18px] w-[34px] border border-border-2 bg-card-2 transition-colors',
          'data-[state=checked]:border-foreground data-[state=checked]:bg-foreground',
          'disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground'
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block h-3 w-3 translate-x-[2px] bg-dim transition-transform',
            'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-black'
          )}
        />
      </SwitchPrimitive.Root>
    </label>
  )
}
