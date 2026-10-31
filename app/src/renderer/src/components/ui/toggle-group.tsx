import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cn } from '@/lib/utils'

/** Segmented control: one row of square buttons, the active one is white on black. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  className
}: {
  value: T | null | undefined
  options: { label: string; value: T; disabled?: boolean }[]
  onChange: (v: T) => void
  disabled?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value == null ? '' : String(value)}
      onValueChange={(v) => {
        if (!v) return
        const opt = options.find((o) => String(o.value) === v)
        if (opt) onChange(opt.value)
      }}
      disabled={disabled}
      className={cn('flex border border-border bg-card-2', className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={String(o.value)}
          value={String(o.value)}
          disabled={o.disabled}
          className={cn(
            'flex-1 border-r border-border px-1.5 py-2 text-[13px] font-medium whitespace-nowrap text-muted transition-colors last:border-r-0',
            'hover:bg-zinc-900 hover:text-foreground',
            'data-[state=on]:bg-foreground data-[state=on]:text-black',
            'disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground'
          )}
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}
