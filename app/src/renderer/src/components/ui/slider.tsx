import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export function Slider({
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  onCommit,
  className
}: {
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  onChange: (v: number) => void
  onCommit?: (v: number) => void
  className?: string
}): React.JSX.Element {
  return (
    <SliderPrimitive.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onChange(v[0])}
      onValueCommit={(v) => onCommit?.(v[0])}
      className={cn('relative flex h-6 w-full touch-none items-center select-none', disabled && 'opacity-30', className)}
    >
      <SliderPrimitive.Track className="relative h-[2px] w-full bg-border-2">
        <SliderPrimitive.Range className="absolute h-full bg-foreground" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3.5 w-3.5 border border-foreground bg-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground" />
    </SliderPrimitive.Root>
  )
}
