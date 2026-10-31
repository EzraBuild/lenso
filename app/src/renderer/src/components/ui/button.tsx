import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'ghost'
type Size = 'default' | 'sm' | 'lg'

const variants: Record<Variant, string> = {
  default: 'bg-foreground text-black border border-foreground hover:bg-zinc-200 disabled:bg-card-2 disabled:border-border disabled:text-dim',
  outline: 'bg-transparent text-foreground border border-border-2 hover:bg-zinc-900 disabled:text-dim',
  ghost: 'bg-transparent text-muted border border-border hover:text-foreground hover:border-border-2'
}
const sizes: Record<Size, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-7 px-2.5 text-[11px] font-mono font-medium',
  lg: 'h-11 px-5 text-[15px]'
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-colors select-none',
        'disabled:cursor-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'
